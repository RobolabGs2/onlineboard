package boardlist

import (
	"container/list"
	"encoding/json"
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

type InputMessage struct {
	Lineid string          `json:"id"`
	Value  json.RawMessage `json:"value"`
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
		defer board.RemoveConnaction(elem)

		for {
			var msgdata InputMessage
			err = conn.ReadJSON(&msgdata)

			if err != nil {
				return
			}

			board.WriteMessages(string(msgdata.Lineid), msgdata.Value, elem)
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

func (bl *BoardList) LoadBoard(lines []json.RawMessage) string {
	result := bl.CreateBoard()
	bl.mutex.Lock()
	board := bl.boards[result]
	bl.mutex.Unlock()

	if len(lines) == 0 {
		return result
	}

	parent := "superline"
	board.WriteMessages(parent, lines[0], nil)
	for i := 1; i < len(lines); i++ {
		var err error
		parent, err = board.CreateLine(parent, lines[i])
		if err != nil {
			fmt.Println("The new created line doesn't work!!!")
		}
	}
	return result
}

func (bl *BoardList) CreateLine(boardid string, parentid string, value json.RawMessage) (string, error) {
	bl.mutex.Lock()
	board := bl.boards[boardid]
	bl.mutex.Unlock()

	if board == nil {
		return "", fmt.Errorf("board %s does not exist", boardid)
	}

	return board.CreateLine(parentid, value)
}

func (bl *BoardList) DeleteLine(boardid string, lineid string) error {
	bl.mutex.Lock()
	board := bl.boards[boardid]
	bl.mutex.Unlock()

	if board == nil {
		return fmt.Errorf("board %s does not exist", boardid)
	}

	return board.DeleteLine(lineid)
}

func (bl *BoardList) ExistBoard(boardid string) bool {
	bl.mutex.Lock()
	defer bl.mutex.Unlock()
	return bl.boards[boardid] != nil
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
