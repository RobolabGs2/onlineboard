package boardlist

import (
	"container/list"

	"github.com/gorilla/websocket"
)

type boardChannels struct {
	channels list.List
}

func (bc *boardChannels) init() *boardChannels {
	bc.channels.Init()
	return bc
}

func (bc *boardChannels) add(conn *websocket.Conn) *list.Element {
	ch := make(chan []byte, 3)

	go func() {
		for {
			msg, ok := <-ch
			if !ok {
				return
			}
			err := conn.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				return
			}
		}
	}()

	elem := bc.channels.PushBack(&ch)
	return elem
}

func (bc *boardChannels) Remove(elem *list.Element) {
	che := elem.Value
	bc.channels.Remove(elem)

	switch ch := che.(type) {
	case *chan []byte:
		close(*ch)
	}
}

func writeChannel(ch *chan []byte, data []byte) {
	defer func() {
		if r := recover(); r != nil {
		}
	}()
	*ch <- data
}

func (bc *boardChannels) writeTo(elem *list.Element, data []byte) {
	switch ch := elem.Value.(type) {
	case *chan []byte:
		writeChannel(ch, data)
	}
}

func (bc *boardChannels) writeAllWithSender(data []byte, sender *list.Element) {
	for e := bc.channels.Front(); e != nil; e = e.Next() {
		if e != sender {
			bc.writeTo(e, data)
		}
	}
}
