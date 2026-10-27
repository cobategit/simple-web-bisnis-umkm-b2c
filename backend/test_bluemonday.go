package main

import (
	"fmt"
	"github.com/microcosm-cc/bluemonday"
)

func main() {
	p := bluemonday.UGCPolicy()
	p.AllowAttrs("target").OnElements("a")
	out := p.Sanitize("<a href='https://google.com' target='_blank'>link</a>")
	fmt.Println("out:", out)
}
