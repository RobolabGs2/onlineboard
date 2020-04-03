package boardlist

import (
	"container/list"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Line struct {
	Id     int             `json:"id"`
	Value  json.RawMessage `json:"value"`
	Number int             `json:"number"`
	elem   *list.Element
}

type Board struct {
	mutex       sync.Mutex
	lines       map[int]*Line
	lineList    list.List
	channels    boardChannels
	lineCounter int
}

func (board *Board) pushLine(line *Line) *Line {
	line.Id = board.lineCounter
	board.lines[board.lineCounter] = line
	board.lineCounter++
	return line
}

func (board *Board) Init() *Board {
	board.channels.init()
	board.lines = make(map[int]*Line)
	board.lineList.Init()
	board.lineCounter = 0

	line := board.pushLine(&Line{Number: 0})
	line.elem = board.lineList.PushBack(line)
	return board
}

func (board *Board) AddConnaction(conn *websocket.Conn) *list.Element {

	board.mutex.Lock()
	defer board.mutex.Unlock()

	elem := board.channels.add(conn)

	for _, value := range board.lines {
		msg, err := json.Marshal(value)
		if err != nil {
			log.Println("bad message")
		}
		board.channels.writeTo(elem, msg)
	}
	return elem
}

func (board *Board) RemoveConnaction(elem *list.Element) {
	board.mutex.Lock()
	board.channels.Remove(elem)
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

func (board *Board) CreateLine(parentid int, value json.RawMessage) (int, error) {
	board.mutex.Lock()

	parent := board.lines[parentid]
	if parent == nil {
		board.mutex.Unlock()
		return 0, fmt.Errorf("line %s does not exist", parentid)
	}

	line := board.pushLine(&Line{Value: value})
	line.elem = board.lineList.InsertAfter(line, parent.elem)
	line.Number = board.recursiveReleaseSpace(parent, line.elem.Next())

	board.unsafeSendMessages(line)
	board.mutex.Unlock()

	return line.Id, nil
}

func (board *Board) DeleteLine(lineid int) error {
	board.mutex.Lock()
	defer board.mutex.Unlock()

	line := board.lines[lineid]
	if line == nil {
		return fmt.Errorf("line %d does not exist", lineid)
	}

	if board.lineList.Len() == 1 {
		return fmt.Errorf("This is the last line")
	}

	delete(board.lines, lineid)
	board.lineList.Remove(line.elem)

	line.Number = -1

	board.unsafeSendMessages(line)

	return nil
}

func (board *Board) unsafeSendMessages(line *Line) {
	board.unsafeSendMessagesWithSender(line, nil)
}

func (board *Board) unsafeSendMessagesWithSender(line *Line, sender *list.Element) {
	msg, err := json.Marshal(line)

	if err != nil {
		return
	}
	board.channels.writeAllWithSender(msg, sender)
}

func (board *Board) WriteMessages(lineid int, msg json.RawMessage, sender *list.Element) {

	board.mutex.Lock()
	defer board.mutex.Unlock()

	line := board.lines[lineid]
	if line == nil {
		return
	}
	line.Value = msg

	board.unsafeSendMessagesWithSender(line, sender)
}
