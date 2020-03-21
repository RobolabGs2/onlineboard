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
		http.ServeFile(writer, request, frontend.FromFrontend("static", "index.html"))
	})

	r.HandleFunc("/icon", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.FromFrontend("static", "icon.ico"))
	})

	r.PathPrefix("/dist").Handler(http.StripPrefix("/dist", http.FileServer(http.Dir(frontend.FromFrontend("/dist")))))
	srv := &http.Server{
		Handler: r,
		Addr:    "0.0.0.0:3000",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	wl := new(WebsocketList).Init()

	r.HandleFunc("/socket", wl.MakeEchoSocket())
	log.Fatal(srv.ListenAndServe())
}

type WebsocketList struct {
	upgrader websocket.Upgrader
	mutex    sync.Mutex
	connects list.List
}

func (wl *WebsocketList) Init() *WebsocketList {
	wl.connects.Init()
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

		conn, err := wl.upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}

		elem := wl.AddConnaction(conn)

		defer func() {
			wl.RemoveConnaction(elem)
			conn.Close()
		}()

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			fmt.Println(string(msg))

			wl.SendMessages(msg)
		}
	}
}

func (wl *WebsocketList) AddConnaction(conn *websocket.Conn) *list.Element {
	wl.mutex.Lock()
	elem := wl.connects.PushBack(conn)
	wl.mutex.Unlock()
	return elem
}

func (wl *WebsocketList) RemoveConnaction(elem *list.Element) {
	wl.mutex.Lock()
	wl.connects.Remove(elem)
	wl.mutex.Unlock()
}

func (wl *WebsocketList) SendMessages(msg []uint8) {
	wl.mutex.Lock()
	for e := wl.connects.Front(); e != nil; e = e.Next() {
		wl.mutex.Unlock()
		switch val := e.Value.(type) {
		case *websocket.Conn:
			err := val.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				fmt.Println("Bad socket in the list!!")
			}
		}
		wl.mutex.Lock()
	}
	wl.mutex.Unlock()
}
