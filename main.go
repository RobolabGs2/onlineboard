package main

import (
	"container/list"
	"fmt"
	"log"
	"net/http"
	"onlineboard/src/frontend"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.From("static", "index.html"))
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

	r.HandleFunc("/socket/{boardid}", wl.MakeEchoSocket())
	log.Fatal(srv.ListenAndServe())
}

type OnlineBoard struct {
	data     []uint8
	connects list.List
}

func (ob *OnlineBoard) Init() *OnlineBoard {
	ob.connects.Init()
	return ob
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

		elem := wl.AddConnaction(conn, boardid)

		defer func() {
			wl.RemoveConnaction(elem, boardid)
			conn.Close()
		}()

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			fmt.Println(string(msg))

			wl.SendMessages(boardid, msg)
		}
	}
}

func (wl *WebsocketList) AddConnaction(conn *websocket.Conn, boardid string) *list.Element {
	wl.mutex.Lock()

	board := wl.boards[boardid]

	if board == nil {
		board = new(OnlineBoard).Init()
		wl.boards[boardid] = board
	}
	elem := board.connects.PushBack(conn)

	wl.mutex.Unlock()

	return elem
}

func (wl *WebsocketList) RemoveConnaction(elem *list.Element, boardid string) {
	wl.mutex.Lock()
	wl.boards[boardid].connects.Remove(elem)
	wl.mutex.Unlock()
}

func (wl *WebsocketList) ChangeBoard(boardid string, newvalue []uint8) []uint8 {
	wl.boards[boardid].data = newvalue
	return newvalue
}

func (wl *WebsocketList) SendMessages(boardid string, msg []uint8) {
	wl.mutex.Lock()
	newmsg := wl.ChangeBoard(boardid, msg)
	for e := wl.boards[boardid].connects.Front(); e != nil; e = e.Next() {
		switch val := e.Value.(type) {
		case *websocket.Conn:
			err := val.WriteMessage(websocket.TextMessage, newmsg)
			if err != nil {
				fmt.Println("Bad socket in the list!!")
			}
		}
	}
	wl.mutex.Unlock()
}

func makeStaticRouter() *mux.Router {
	r := mux.NewRouter()
	r.Handle(`/{file:.+\.(?:ico|jpe?g|png|gif|bmp)}`, frontend.FileServer("assets", "images"))
	r.Handle(`/{file:.+\.css}`, frontend.FileServer("assets", "styles"))
	return r
}
