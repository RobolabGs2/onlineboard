type Color = string;

export class ColorTheme {
    constructor(readonly boardBackground: Color, readonly boardText: Color,
                readonly lineBackground: Color, readonly lineText: Color) {
    }
}

const colorThemeInStorage = "color-theme";

function SetColorTheme(theme: ColorTheme) {
    const root = document.querySelector(':root') as (HTMLElement | null);
    if (!root) {
        throw "Can't change color theme: root element is null!";
    }
    root.style.setProperty('--line-text-color', theme.lineText);
    root.style.setProperty('--line-background-color', theme.lineBackground);
    root.style.setProperty('--board-background-color', theme.boardBackground);
    root.style.setProperty('--board-text-color', theme.boardText);
    localStorage.setItem(colorThemeInStorage, JSON.stringify(theme))
}

class ColorThemeView {
    constructor(parent: HTMLElement, theme: ColorTheme) {
        const board = document.createElement('div');
        board.addEventListener('click', () => SetColorTheme(theme));
        board.style.backgroundColor = theme.boardBackground;
        board.style.color = theme.boardText;
        board.textContent = "Aa";
        const line = document.createElement('div');
        line.style.backgroundColor = theme.lineBackground;
        line.style.color = theme.lineText;
        line.textContent = "Bb";
        board.append(line);
        parent.append(board);
    }
}

export class ColorThemesPanel {
    constructor(parent: HTMLElement, themes: Array<ColorTheme>) {
        const storedTheme = localStorage.getItem(colorThemeInStorage);
        if (storedTheme) SetColorTheme(JSON.parse(storedTheme));
        const article = document.createElement('article');
        article.classList.add('color-themes-panel', 'simple-row');
        themes.forEach(theme => new ColorThemeView(article, theme));
        parent.append(article);
    }
}
