package boardlist

import (
	"container/list"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Line struct {
	Id     string          `json:"id"`
	Value  json.RawMessage `json:"value"`
	Number int             `json:"number"`
	elem   *list.Element
}

type Board struct {
	mutex    sync.Mutex
	lines    map[string]*Line
	lineList list.List
	connects list.List
}

func (board *Board) Init() *Board {
	board.connects.Init()
	board.lines = make(map[string]*Line)
	board.lineList.Init()

	line := &Line{Id: "", Number: 0}
	board.lines[""] = line
	line.elem = board.lineList.PushBack(line)
	return board
}

func (board *Board) AddConnaction(conn *websocket.Conn) *list.Element {
	board.mutex.Lock()
	elem := board.connects.PushBack(conn)
	for _, value := range board.lines {
		err := conn.WriteJSON(value)
		if err != nil {
			fmt.Println("Bad socket!!")
		}
	}
	board.mutex.Unlock()
	return elem
}

func (board *Board) RemoveConnaction(elem *list.Element, boardid string) {
	board.mutex.Lock()
	board.connects.Remove(elem)
	board.mutex.Unlock()
}

func (board *Board) recursiveReleaseSpace(pred *Line, nextElem *list.Element) int {
	if nextElem == nil {
		return pred.Number + 65536
	}

	switch next := nextElem.Value.(type) {
	case *Line:

		delta := next.Number - pred.Number

		if delta > 1 {
			return pred.Number + (delta*2)/3
		}

		next.Number = board.recursiveReleaseSpace(next, next.elem.Next())
		delta = next.Number - pred.Number
		board.unsafeSendMessages(next)
		return pred.Number + (delta*2)/3
	}
	return 0
}

func (board *Board) CreateLine(parentid string, value json.RawMessage) (string, error) {
	board.mutex.Lock()

	parent := board.lines[parentid]
	if parent == nil {
		board.mutex.Unlock()
		return "", fmt.Errorf("line %s does not exist", parentid)
	}

	line := &Line{Id: uuid.New().String(), Value: value}
	board.lines[line.Id] = line
	line.elem = board.lineList.InsertAfter(line, parent.elem)

	line.Number = board.recursiveReleaseSpace(parent, line.elem.Next())

	board.unsafeSendMessages(line)
	board.mutex.Unlock()

	return line.Id, nil
}

func (board *Board) DeleteLine(lineid string) error {
	board.mutex.Lock()

	line := board.lines[lineid]
	if line == nil {
		board.mutex.Unlock()
		return fmt.Errorf("line %s does not exist", lineid)
	}

	board.lines[lineid] = nil
	board.lineList.Remove(line.elem)

	line.Number = -1

	board.unsafeSendMessages(line)
	board.mutex.Unlock()

	return nil
}

func (board *Board) unsafeSendMessages(line *Line) {
	for e := board.connects.Front(); e != nil; e = e.Next() {
		switch val := e.Value.(type) {
		case *websocket.Conn:
			err := val.WriteJSON(line)
			if err != nil {
				fmt.Println("Bad socket in the list!!")
			}
		}
	}
}

func (board *Board) WriteMessages(lineid string, msg json.RawMessage) {

	board.mutex.Lock()
	defer board.mutex.Unlock()

	line := board.lines[lineid]
	if line == nil {
		return
	}
	line.Value = msg

	board.unsafeSendMessages(line)
}
