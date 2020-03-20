package main

import (
	"fmt"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"onlineboard/src/frontend"
	"time"
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
	r.HandleFunc("/socket", makeEchoSocket(new(websocket.Upgrader)))
	log.Fatal(srv.ListenAndServe())
}

func makeEchoSocket(upgrader *websocket.Upgrader) func(writer http.ResponseWriter, request *http.Request) {
	return func(writer http.ResponseWriter, request *http.Request) {
		var err error
		defer func() {
			if err != nil {
				log.Println("Websocket:", err)
			}
		}()
		conn, err := upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			t, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			fmt.Println(string(msg))
			if err = conn.WriteMessage(t, msg); err != nil {
				return
			}
		}
	}
}

func makeStaticRouter() *mux.Router {
	r := mux.NewRouter()
	r.Handle(`/{file:.+\.(?:ico|jpe?g|png|gif|bmp)}`, frontend.FileServer("assets", "images"))
	r.Handle(`/{file:.+\.css}`, frontend.FileServer("assets", "styles"))
	return r
}
