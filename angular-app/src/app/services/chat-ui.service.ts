import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatUiService {
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  public isChatOpen$ = this.isChatOpenSubject.asObservable();

  toggleChat(): void {
    this.isChatOpenSubject.next(!this.isChatOpenSubject.value);
  }

  openChat(): void {
    this.isChatOpenSubject.next(true);
  }

  closeChat(): void {
    this.isChatOpenSubject.next(false);
  }
}