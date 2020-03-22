package boardlist

import (
	"container/list"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

type Board struct {
	mutex    sync.Mutex
	data     []uint8
	connects list.List
}

func (board *Board) Init() *Board {
	board.connects.Init()
	return board
}

func (board *Board) AddConnaction(conn *websocket.Conn) *list.Element {
	board.mutex.Lock()
	elem := board.connects.PushBack(conn)
	board.mutex.Unlock()
	return elem
}

func (board *Board) RemoveConnaction(elem *list.Element, boardid string) {
	board.mutex.Lock()
	board.connects.Remove(elem)
	board.mutex.Unlock()
}

func (board *Board) Change(newvalue []uint8) []uint8 {
	board.data = newvalue
	return newvalue
}

func (board *Board) SendMessages(msg []uint8) {
	board.mutex.Lock()
	newmsg := board.Change(msg)
	for e := board.connects.Front(); e != nil; e = e.Next() {
		switch val := e.Value.(type) {
		case *websocket.Conn:
			err := val.WriteMessage(websocket.TextMessage, newmsg)
			if err != nil {
				fmt.Println("Bad socket in the list!!")
			}
		}
	}
	board.mutex.Unlock()
}
