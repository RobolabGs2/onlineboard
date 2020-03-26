import "./index.css"
import {ColorThemesPanel} from "../common/style";
import {Themes} from "../common/themes";
const header = document.body.getElementsByTagName('header')[0];
new ColorThemesPanel(header, Themes);

const sectionWithExample = document.getElementById('example');
if (!sectionWithExample)
    throw 'Error: not found section for examples';

setInterval(() => {
    // if (socket.bufferedAmount === 0) {
    //     board.changes().forEach(x => socket.send(JSON.stringify(x)));
    // }
}, 1000 / 40);