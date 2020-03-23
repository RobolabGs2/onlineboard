export const SVGPictures = {
    Edit: makeSVG(`<path d="M30 7 L25 2 5 22 3 29 10 27 Z M21 6 L26 11 Z M5 22 L10 27 Z" />`, "i-edit"),
    Language: makeSVG(`<path d="M10 9 L3 17 10 25 M22 9 L29 17 22 25 M18 7 L14 27" />`, "i-code"),
};

function makeSVG(source: string, id: string, size: number = 24): string {
    return `<svg id="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1">${source}</svg>`
}
