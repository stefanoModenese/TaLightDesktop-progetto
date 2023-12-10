import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { AutoComplete } from 'primeng/autocomplete';
import { ApiService, ApiState } from 'src/app/services/api-service/api.service';
import { NotificationManagerService, NotificationMessage, NotificationType } from 'src/app/services/notification-mananger-service/notification-manager.service';
import { ProblemManagerService } from 'src/app/services/problem-manager-service/problem-manager.service';
import { AppTheme, ThemeService } from 'src/app/services/theme-service/theme.service';
import { ProjectManagerService } from 'src/app/services/project-manager-service/project-manager.service';
import { Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'tal-topbar-widget',
  templateUrl: './topbar-widget.component.html',
  styleUrls: ['./topbar-widget.component.scss']
})
export class TopbarWidgetComponent implements OnInit {

  @ViewChild("urlInput") public urlInput?: AutoComplete;
  @ViewChild("statusDot") public statusDot?: ElementRef;
  @ViewChild("messageBox") public messageBox?: ElementRef;
  @Output() newEventItem = new EventEmitter<string>;
  @ViewChild("myLabel") public myLabel?: ElementRef;
  

  url;
  lastUrl;
  urlCache:string[] = []
  escapeRegEx = /[.*+?^${}()|[\]\\]/g
  urlInputClass = ""
  subApiState
  subProblemError
  subOnNotify
  subOnLabel
  currentNotification?:NotificationMessage
  label:string = '';

  constructor( public readonly themeService: ThemeService, 
               public api: ApiService,
               public zone: NgZone,
               public pm: ProblemManagerService,
               public nm: NotificationManagerService,
               public pj: ProjectManagerService
             ) {
    this.url = api.url;
    this.lastUrl=this.url+"";
    //this.lastUrl = this.getLastInsertedUrl();
    this.urlCache = [...this.api.urlCache]
    this.subApiState = this.api.onApiStateChange.subscribe((state:ApiState)=>{this.updateState(state)})
    this.subProblemError = this.pm.onError.subscribe((_)=>{this.stateBad()})
    this.subOnNotify = this.nm.onNotification.subscribe((msg:NotificationMessage): void=>{this.showNotification(msg)})
    //this.pj.onProjectChanged.subscribe((name) => {});
    this.subOnLabel = this.pj.onLabelChanged.subscribe((nome)=>{this.label = nome});

  }

  ngOnInit(): void {
    this.pj.onLabelChanged.subscribe((nome) => {
      //this.label = nome;
      var L = this.myLabel?.nativeElement as HTMLElement
      L.innerHTML = nome;
    })
    this.lastUrl = this.api.getLastInsertedUrl();
    let ciao = "l'ultimo inserito è: " + this.lastUrl;
    alert(ciao);
    this.url = this.lastUrl;
    if (this.urlInput) {
      this.urlInput.writeValue(this.url);
    }
  }

  ngAfterViewInit(): void {
    /*if (this.urlInput) {
      this.urlInput.ngModel = this.url;
    }*/
  }

  /*public getLastInsertedUrl(): string {
    return this.api.getLastInsertedUrl();
  }*/

  public get changeThemIcon(): string {
    return this.themeService.currentTheme == AppTheme.dark ? 'pi-sun' : 'pi-moon';
  }

  public toggleTheme() {
    this.themeService.toggleTheme();
  }

  public iconForNotification(){
    let icon = "pi-info"
    switch(this.currentNotification?.type){
      default:
      case NotificationType.System:
      case NotificationType.Debug:
      case NotificationType.Info:
        icon = "pi-info"
        break;
      case NotificationType.Warning:
      case NotificationType.Error:
        icon = "pi-error"
    }
    return icon
  }

  showNotification(msg:NotificationMessage, timeout=3){
    let box = this.messageBox?.nativeElement as HTMLElement
    box.style.display = "flex"
    this.currentNotification=msg
    setTimeout(()=>{this.hideNotification()}, timeout * 1000)
  }

  hideNotification(){
    let box = this.messageBox?.nativeElement as HTMLElement
    box.style.display = "none"
    this.currentNotification=undefined
  }
  

  filterSuggestions(event:any) {
    let query = event.query.replace(this.escapeRegEx, '\\$&')
    let filter = new RegExp(".*"+query+".*")
    let urlCache:string[] = []
    this.api.urlCache.forEach( (url:string) => {
      if(url.match(filter)){
        urlCache.push(url)
      }
    });
    this.urlCache=urlCache
  }

  public updateState(state:ApiState){
    let dot = this.statusDot!.nativeElement as HTMLElement
    switch(state){
      case ApiState.Idle: dot.style.color=""; break;
      case ApiState.Good: dot.style.color="green"; break;
      case ApiState.Maybe: dot.style.color="orange"; break;
      case ApiState.Bad: dot.style.color="darkred"; break;
    }
  }

  public stateIdle(){ this.updateState(ApiState.Idle); }
  public stateGood(){ this.updateState(ApiState.Good); }
  public stateMaybe(){ this.updateState(ApiState.Maybe); }
  public stateBad(){ this.updateState(ApiState.Bad); }

  public changeURL(event:Event) {
    if(this.lastUrl == this.url){return}
    this.stateIdle()
    let dot = this.statusDot!.nativeElement as HTMLElement
    console.log("changeURL:dot:", dot)
    console.log("changeURL:event:", event)
    let url = this.url;
    console.log("changeURL:urlCache:before:",this.urlCache)
    if( !this.api.setUrl(url) ){
      this.stateBad()
      console.log("changeURL:setURL:failed")
    }else{
      this.url = this.api.url;
      console.log("changeURL:setURL:success")
      this.urlCache = this.api.urlCache
      this.stateMaybe()
      this.pm.updateProblems()
    }
    
    console.log("changeURL:urlCache:after:", this.urlCache )
    console.log("changeURL:url:", this.url )
    this.lastUrl = this.url + ""
  }

  public removeURL(url:string, event:Event) {
    if(event){ event.preventDefault();event.stopPropagation();event.stopImmediatePropagation(); }
    
    console.log("changeURL:urlCache:before:",this.urlCache)
    if( !this.api.removeFromCache(url) ){
      console.log("changeURL:removeURL:done")
    }
    this.urlCache = this.api.urlCache
    


    console.log("changeURL:urlCache:after:",this.urlCache)
    console.log("changeURL:url:",url)
  }

  public onClick(nome:string) {
    //this.label = nome;
    //alert('grazie per aver cliccato');
    const fakeProject = {};
    //this.pj.setCurrentProject(nome);
    this.pj.setLabel(nome);
    //this.projectservice.setCurrentProject(nome);
  }

  addNewItem(value:string) {
    this.newEventItem.emit(value);
  }
  
}
