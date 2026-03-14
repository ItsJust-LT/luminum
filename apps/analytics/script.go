package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/js"
)

// Session cookie name used by both tracking and form scripts so the same visitor
// is identified across page views and form submissions.
const SessionCookieName = "__luminum_sid"

// Session cookie max age in days (1 year).
const SessionCookieMaxAgeDays = 365

// Shared session JS: same cookie name, UUID format, and robust get/set so tracking and forms see the same session.
const sessionJS = `
function getCookie(n){var c=document.cookie||"";var i=c.indexOf(n+"=");if(i===-1)return null;var s=i+n.length+1;var e=c.indexOf(";",s);var v=(e===-1?c.slice(s):c.slice(s,e)).replace(/^\s+|\s+$/g,"");try{return v?decodeURIComponent(v):null;}catch(_){return null;}}
function setCookie(n,v,d){var sec=location.protocol==="https:"?"; Secure":"";var e=new Date(Date.now()+d*864e5).toUTCString();document.cookie=n+"="+encodeURIComponent(v)+"; path=/; expires="+e+"; max-age="+(d*86400)+"; SameSite=Lax"+sec;}
function uuid(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16);});}
function getOrCreateSid(){var s=getCookie("%s");if(s&&/^[a-zA-Z0-9_-]{8,64}$/.test(s))return s;s=uuid();setCookie("%s",s,%d);return s;}
`

func serveTrackingScript(w http.ResponseWriter, r *http.Request) {
	websiteId := r.URL.Query().Get("websiteId")
	if websiteId == "" {
		http.Error(w, "Missing websiteId", http.StatusBadRequest)
		return
	}

	origin := getServerOrigin(r)
	wsOrigin := getWSOrigin(r)

	rawJS := fmt.Sprintf(`(function(){
%s
var wid="%s",api="%s",wsApi="%s",sid=getOrCreateSid();
var _ws=null,_eid=null,_lastUrl=location.href;
function trackPage(url,ref){
var p={websiteId:wid,sessionId:sid,url:url,referrer:ref||document.referrer,screen:innerWidth+"x"+innerHeight,pageTitle:(document.title||"").slice(0,500),userAgent:navigator.userAgent};
fetch(api+"/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}).then(function(r){return r.json()}).then(function(d){
if(d.eventId){
_eid=d.eventId;
if(!_ws||_ws.readyState>1){try{_ws=new WebSocket(wsApi+"/ws?websiteId="+wid+"&eventId="+d.eventId);_ws.onclose=function(){_ws=null;};}catch(e){}}
}
}).catch(function(){});
}
function onNav(){
var cur=location.href;
if(cur===_lastUrl)return;
var prev=_lastUrl;_lastUrl=cur;
if(_ws&&_ws.readyState===1&&_eid){
try{_ws.send(JSON.stringify({eventId:_eid,sessionId:sid,url:cur,referrer:prev,screenSize:innerWidth+"x"+innerHeight}));}catch(e){}
}
trackPage(cur,prev);
}
var _origPush=history.pushState,_origReplace=history.replaceState;
history.pushState=function(){_origPush.apply(history,arguments);onNav();};
history.replaceState=function(){_origReplace.apply(history,arguments);onNav();};
window.addEventListener("popstate",onNav);
window.addEventListener("hashchange",onNav);
trackPage(location.href,document.referrer);
})();`, fmt.Sprintf(sessionJS, SessionCookieName, SessionCookieName, SessionCookieMaxAgeDays), websiteId, origin, wsOrigin)

	m := minify.New()
	m.AddFunc("text/javascript", js.Minify)
	minified, err := m.String("text/javascript", rawJS)
	if err != nil {
		minified = rawJS
	}

	w.Header().Set("Content-Type", "application/javascript")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Header().Set("Expires", time.Now().Add(1*time.Hour).Format(http.TimeFormat))
	fmt.Fprint(w, minified)
}

func serveFormScript(w http.ResponseWriter, r *http.Request) {
	websiteId := r.URL.Query().Get("websiteId")
	if websiteId == "" {
		http.Error(w, "Missing websiteId", http.StatusBadRequest)
		return
	}

	origin := getServerOrigin(r)

	rawJS := fmt.Sprintf(`(function(){
var d=document,w=window;
%s
var wid="%s",api="%s";
function collect(form){var data={};var els=form.querySelectorAll("input,select,textarea");for(var i=0;i<els.length;i++){var el=els[i];var name=el.name||el.id;if(!name)continue;if(el.type==="radio"||el.type==="checkbox"){if(el.checked)data[name]=el.value||"on";}else data[name]=el.value||"";}return data;}
function submit(data,formName){var payload={websiteId:wid,sessionId:getOrCreateSid(),formName:formName||"Form"};if(data)for(var k in data)if(data.hasOwnProperty(k))payload[k]=data[k];try{var x=new XMLHttpRequest();x.open("POST",api+"/form",true);x.setRequestHeader("Content-Type","application/json");x.send(JSON.stringify(payload));}catch(e){}}
function attach(){var forms=d.querySelectorAll("form[data-luminum-capture],form.luminum-capture");for(var i=0;i<forms.length;i++){(function(f){if(f._lum)return;f._lum=true;f.addEventListener("submit",function(ev){submit(collect(f),f.getAttribute("name")||f.getAttribute("id")||f.getAttribute("data-form-name")||"Form");if(f.getAttribute("data-luminum-only")!==null)ev.preventDefault();});})(forms[i]);}}
if(d.readyState==="complete")attach();else w.addEventListener("load",attach);
w.addEventListener("DOMContentLoaded",attach);
w.__luminumForms={submit:submit,collect:function(f){return f?collect(f):{};},sid:getOrCreateSid};
})();`, fmt.Sprintf(sessionJS, SessionCookieName, SessionCookieName, SessionCookieMaxAgeDays), websiteId, origin)

	m := minify.New()
	m.AddFunc("text/javascript", js.Minify)
	minified, err := m.String("text/javascript", rawJS)
	if err != nil {
		minified = rawJS
	}

	w.Header().Set("Content-Type", "application/javascript")
	w.Header().Set("Cache-Control", "public, max-age=300")
	fmt.Fprint(w, minified)
}

func getServerOrigin(r *http.Request) string {
	proto := "https"
	if r.TLS == nil {
		if fwd := r.Header.Get("X-Forwarded-Proto"); fwd != "" {
			proto = fwd
		} else {
			proto = "http"
		}
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	return fmt.Sprintf("%s://%s", proto, host)
}

func getWSOrigin(r *http.Request) string {
	proto := "wss"
	if r.TLS == nil {
		if fwd := r.Header.Get("X-Forwarded-Proto"); fwd == "https" {
			proto = "wss"
		} else if fwd == "" {
			proto = "ws"
		}
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	return fmt.Sprintf("%s://%s", proto, host)
}
