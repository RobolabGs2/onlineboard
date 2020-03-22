package boardlist

import (
	"container/list"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

func New() *BoardList {
	return new(BoardList).Init()
}

type BoardList struct {
	upgrader websocket.Upgrader
	mutex    sync.Mutex
	boards   map[string]*Board
}

func (bl *BoardList) Init() *BoardList {
	bl.boards = make(map[string]*Board)
	return bl
}

func (bl *BoardList) MakeEchoSocket() func(writer http.ResponseWriter, request *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		var err error
		defer func() {
			if err != nil {
				log.Println("Websocket:", err)
			}
		}()

		boardid := mux.Vars(request)["boardid"]

		conn, err := bl.upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		elem, board, err := bl.AddConnaction(conn, boardid)
		if err != nil {
			return
		}
		defer board.RemoveConnaction(elem, boardid)

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			fmt.Println(string(msg))

			board.SendMessages(msg)
		}
	}
}

func (bl *BoardList) CreateBoard() string {
	boardid := uuid.New().String()
	bl.mutex.Lock()
	bl.boards[boardid] = new(Board).Init()
	bl.mutex.Unlock()
	return boardid
}

func (bl *BoardList) AddConnaction(conn *websocket.Conn, boardid string) (*list.Element, *Board, error) {

	bl.mutex.Lock()
	board := bl.boards[boardid]
	bl.mutex.Unlock()

	if board == nil {
		return nil, nil, fmt.Errorf("board %s does not exist", boardid)
	}

	elem := board.AddConnaction(conn)

	return elem, board, nil
}
