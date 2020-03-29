import {LineID} from "../boardline";
import {LineSnapshot} from "../line";
import {BoardActionsHandler} from "../board";

export class HttpBoardHandler implements BoardActionsHandler {
    constructor(readonly id: string) {
    }

    addLine(parentId: number | string, type: "katex" | "plain" | "asciimath"): Promise<LineID> {
        return fetch(`/board/${(this.id)}/line`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: parentId,
                value: new LineSnapshot("", type)
            })
        }).then(value => value.text()) as Promise<LineID>
    }

    deleteLine(id: LineID): Promise<boolean> {
        return fetch(`/board/${this.id}/line/${id}`, {method: 'DELETE'}).then(value => value.ok);
    }
}