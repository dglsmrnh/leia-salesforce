import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBookScore from '@salesforce/apex/BookScoreAPI.getBookScore';

export default class OrderProductLeadModal extends LightningModal {
  @api book;
  @track excerpt;

  score = {};

  labels = {
		errorMessage: 'Não foi possível continuar'
	}

  handleOkay() {
    this.close('okay');
  }

  handleSearch() {
    getBookScore({ excerpt: this.excerpt })
			.then(resolve => {
				this.score = resolve;
			})
			.catch(error => {
				console.log('Error to see score! =>', error);
				this.handlerDispatchToast(this.labels.errorMessage, '', 'error');
			})
			.finally(() => {
			});
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