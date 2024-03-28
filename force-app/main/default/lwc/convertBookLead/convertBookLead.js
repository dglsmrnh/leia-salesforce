import { LightningElement, api, wire, track } from 'lwc';
import { CloseActionScreenEvent } from "lightning/actions";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import NAME_FIELD from "@salesforce/schema/BookLead__c.Name";
import BOOK_FIELD from "@salesforce/schema/BookLead__c.Book__c";
import getMemoryGameData from '@salesforce/apex/ShadifyAPI.getMemoryGameData';
import createGameMemory from '@salesforce/apex/CreateGameController.createGameMemory';
import getProductData from '@salesforce/apex/CreateGameController.getProductData';
import { RefreshEvent } from "lightning/refresh";

export default class ConvertBookLead extends LightningElement {
  @api recordId;
  @api objectApiName;
  @track currentStep = 1;
  @track currentCheckpoint = 0;

  isShowLoading = false

  @wire(getRecord, { recordId: "$recordId", fields: [NAME_FIELD, BOOK_FIELD] })
  bookLead;

  get name() {
    return getFieldValue(this.bookLead.data, NAME_FIELD);
  }

  @track bookData;
  @track checkpoints = [];

  @wire(getProductData, { bookLeadId: '$recordId' })
  wiredBookData({ error, data }) {
      if (data) {
          this.bookData = data;
      } else if (error) {
          console.error('Error to see book data! =>', error);
          this.handlerDispatchToast(this.labels.errorMessage, '', 'error');
      }
  }

  get lastStep() {
    return this.currentStep == 2;
  }

  nextStep() {
    this.currentStep += 1;
  }

  prevStep() {
    this.currentStep -= 1;
  }

  selectedGameType = '';
  gameTypeOptions = [
      { label: 'Memoria', value: 'Memory' } //,
      // { label: 'Caça-Palavra', value: 'WordSearch' }
  ];

  gameData = {};

  totalPairs = 0;
  @track pairValues = [];
  fileContentVersionIds = new Map();
  
  labels = {
		errorMessage: 'Não foi possível completar a requisição.',
		saveMessage: 'Jogo cadastrado com sucesso.',
    header: 'Liberar o livro',
    steps: {
      step1: 'Escolher jogo',
      step2: 'Checkpoints'
    }
	}

  isFileUploaded(pairIndex) {
    return !this.fileContentVersionIds.has(pairIndex);
  }

  handleGameTypeChange(event) {
      this.selectedGameType = event.detail.value;
      console.log('selected data');

      if(this.selectedGameType == 'Memory') {
        this.isShowLoading = true;
        getMemoryGameData({type: this.selectedGameType})
          .then(resolve => {
            this.gameData = resolve;
            this.totalPairs = resolve.totalPairs;
            for(let i = 0; i < this.totalPairs; i++) {
              this.pairValues.push({ value: resolve.pairPositions[i].value, uploaded: false, img: '', contentVersionId: '' }); // Initialize uploaded status as false
            }
          })
          .catch(error => {
            console.log('Error to see game data! =>', error);
            this.handlerDispatchToast(this.labels.errorMessage, '', 'error');
          })
          .finally(() => {
            this.isShowLoading = false;
        });
      }
  }

  handleSliderChange(event) {
    this.currentCheckpoint = event.detail.value;
  }

  handleAddCheckpoint() {
    if(this.currentCheckpoint > 0) {
      this.checkpoints.push(this.currentCheckpoint);
      this.currentCheckpoint = 0;
    }
  }

  handleRemoveCheckpoint(event) {
    event.preventDefault();
    const checkpoint = event.target.dataset.checkpoint;
    this.checkpoints = this.checkpoints.filter(item => item !== checkpoint);
  }

  handleSuccess(e) {
    this.isShowLoading = true;
    if(this.selectedGameType == 'Memory') {
      createGameMemory({recordId: this.recordId, type: this.selectedGameType, gameData: this.gameData, images: this.pairValues, checkpoints: this.checkpoints })
        .then(resolve => {
          this.handlerDispatchToast(this.labels.saveMessage, '', 'success');
        })
        .catch(error => {
          console.log('Error to saving game data! =>', error);
          this.handlerDispatchToast(this.labels.errorMessage, '', 'error');
        })
        .finally(() => {
          this.isShowLoading = false;
          this.dispatchEvent(new CloseActionScreenEvent());
          this.dispatchEvent(new RefreshEvent());
      });
    }    
  }

  handleUploadFinished(event) {
      console.log(event.detail);
      console.log(event.target.dataset);
      const uploadedFiles = event.detail.files;
      if(uploadedFiles && uploadedFiles.length > 0){
        const file = event.detail.files[0];
        console.log(file);
        const pairIndex = this.pairValues.findIndex(pair => pair.value === event.target.dataset.pair);
        if (pairIndex !== -1 && file) {
          console.log(pairIndex);
          this.fileContentVersionIds.set(event.target.dataset.pair, file.contentVersionId);
          this.pairValues[pairIndex].uploaded = true;
          this.pairValues[pairIndex].img = file.name;
          this.pairValues[pairIndex].contentVersionId = file.contentVersionId;
        }
      }
  }

  handlerDispatchToast(title, message, variant) {
		this.dispatchEvent(
			new ShowToastEvent({
				title: title,
				message: message,
				variant: variant
			})
		);
	}

}