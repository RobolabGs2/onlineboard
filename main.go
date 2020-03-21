package main

import (
	"container/list"
	"fmt"
	"log"
	"net/http"
	"onlineboard/src/frontend"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.From("static", "index.html"))
	})
	r.HandleFunc("/board/{id}", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.From("static", "desk.html"))
	})
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static", makeStaticRouter()))
	r.PathPrefix("/dist").Handler(http.StripPrefix("/dist", frontend.FileServer("/dist")))
	srv := &http.Server{
		Handler: r,
		Addr:    "0.0.0.0:3000",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	wl := new(WebsocketList).Init()

	r.HandleFunc("/new", func(w http.ResponseWriter, r *http.Request) {
		boardid := uuid.New().String()
		wl.AddBoard(boardid)
		http.Redirect(w, r, "/board/"+boardid, 303)
	})

	r.HandleFunc("/socket/{boardid}", wl.MakeEchoSocket())
	log.Fatal(srv.ListenAndServe())
}

type OnlineBoard struct {
	mutex    sync.Mutex
	data     []uint8
	connects list.List
}

func (ob *OnlineBoard) Init() *OnlineBoard {
	ob.connects.Init()
	return ob
}

func (ob *OnlineBoard) AddConnaction(conn *websocket.Conn) *list.Element {
	ob.mutex.Lock()
	elem := ob.connects.PushBack(conn)
	ob.mutex.Unlock()
	return elem
}

func (ob *OnlineBoard) RemoveConnaction(elem *list.Element, boardid string) {
	ob.mutex.Lock()
	ob.connects.Remove(elem)
	ob.mutex.Unlock()
}

func (ob *OnlineBoard) Change(newvalue []uint8) []uint8 {
	ob.data = newvalue
	return newvalue
}

func (ob *OnlineBoard) SendMessages(msg []uint8) {
	ob.mutex.Lock()
	newmsg := ob.Change(msg)
	for e := ob.connects.Front(); e != nil; e = e.Next() {
		switch val := e.Value.(type) {
		case *websocket.Conn:
			err := val.WriteMessage(websocket.TextMessage, newmsg)
			if err != nil {
				fmt.Println("Bad socket in the list!!")
			}
		}
	}
	ob.mutex.Unlock()
}

type WebsocketList struct {
	upgrader websocket.Upgrader
	mutex    sync.Mutex
	boards   map[string]*OnlineBoard
}

func (wl *WebsocketList) Init() *WebsocketList {
	wl.boards = make(map[string]*OnlineBoard)
	return wl
}

func (wl *WebsocketList) MakeEchoSocket() func(writer http.ResponseWriter, request *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		var err error
		defer func() {
			if err != nil {
				log.Println("Websocket:", err)
			}
		}()

		boardid := mux.Vars(request)["boardid"]

		conn, err := wl.upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		elem, board, err := wl.AddConnaction(conn, boardid)
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

func (wl *WebsocketList) AddBoard(boardid string) {
	wl.mutex.Lock()
	wl.boards[boardid] = new(OnlineBoard).Init()
	wl.mutex.Unlock()
}

func (wl *WebsocketList) AddConnaction(conn *websocket.Conn, boardid string) (*list.Element, *OnlineBoard, error) {

	wl.mutex.Lock()
	board := wl.boards[boardid]
	wl.mutex.Unlock()

	if board == nil {
		return nil, nil, fmt.Errorf("board %s does not exist", boardid)
	}

	elem := board.AddConnaction(conn)

	return elem, board, nil
}

func makeStaticRouter() *mux.Router {
	r := mux.NewRouter()
	r.Handle(`/{file:.+\.(?:ico|jpe?g|png|gif|bmp)}`, frontend.FileServer("assets", "images"))
	r.Handle(`/{file:.+\.css}`, frontend.FileServer("assets", "styles"))
	return r
}
