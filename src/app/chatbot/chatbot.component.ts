import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IWeather, IWeatherMessages, IWeatherResponse } from './types/interfaces';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  messages: any[] = []; // TODO: Type any should be removed
  location: string = '';
  apiKey: string = '';
  assistantId: string = '';
  payload: object = {};
  showPopup: boolean = true;
  popupError: string = '';
  threadId: string = '';
  chatgptResponse: string = '';
  weatherResponse: IWeather[] = [];
  error: null | string = null;
  sendingMessage: boolean = false;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    // Check if API key and Assistant ID are saved in localStorage
    if (typeof localStorage !== 'undefined') {
      const savedApiKey = localStorage.getItem('apiKey');
      const savedAssistantId = localStorage.getItem('assistantId');
      if (savedApiKey && savedAssistantId) {
        this.apiKey = savedApiKey;
        this.assistantId = savedAssistantId;
        this.showPopup = false;
      }
    }
  }

  // Remove saved credentials from localStorage before unloading the window
  @HostListener('window:beforeunload')
  onBeforeUnload() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('apiKey');
      localStorage.removeItem('assistantId');
      localStorage.removeItem('threadId');
    }
  }

  // Save API key and Assistant ID to localStorage
  saveCredentials(): void {
    if (this.apiKey === "" || this.assistantId === "") {
      this.showPopup = true
      this.popupError = "Please enter your OpenAI API Key and Assistant ID."
      return
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('apiKey', this.apiKey);
      localStorage.setItem('threadId', this.threadId);
      localStorage.setItem('assistantId', this.assistantId);
      this.showPopup = false;
    }
  }

  // Send user message to the server and handle response
  async sendMessage(): Promise<void> {
    if (this.location.trim() === '') return;
    this.sendingMessage = true;
    this.messages.push(`You: ${this.location}` as string);
    this.payload = {
      location: this.location,
      apiKey: this.apiKey,
      assistantId: this.assistantId,
      previousThreadId: (typeof localStorage !== 'undefined') ? localStorage.getItem('threadId') : null
    }
    this.http.post<IWeatherResponse>(environment.apiUrl, { message: this.payload }).subscribe(response => {
      if (response.weatherApiError) {
        this.messages.push(`Bot ChatGpt message : ${response.weatherApiError}`);
      } else {
        if (response.openAiExceedQuotaError) {
          this.messages.push(`Bot ChatGpt message : ${response.openAiExceedQuotaError}`);
        }
        else {
          this.messages.push(`Bot ChatGpt message : ${response.response}`);
        }
        this.threadId = response.threadId;
        const weatherData = response.weather as IWeather[];
        this.messages.push({ weatherResponse: weatherData });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('threadId', this.threadId);
        }
      }
      this.sendingMessage = false;
    }, error => {
      console.error('Error:', error);
      this.sendingMessage = false;
      this.messages.push('Bot: Oops! Something went wrong.');
    });
    this.location = '';
  }

  // Check if a message is an object
  isObject(message: object | IWeatherMessages): boolean {
    return typeof message === 'object' && !Array.isArray(message);
  }

  // Check if a message is a string
  isString(message: string): boolean {
    return typeof message === 'string';
  }
}
