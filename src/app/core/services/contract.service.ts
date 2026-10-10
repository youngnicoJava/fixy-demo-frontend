import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ContractSummary, QuoteInput, VisitInput } from '../../models/contract.model';
@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly http = inject(HttpClient);
  private url(id: number) {
    return environment.apiUrl + '/requests/' + id + '/contract';
  }
  get(id: number) {
    return this.http.get<ContractSummary>(this.url(id));
  }
  sendQuote(id: number, input: QuoteInput) {
    return this.http.post<ContractSummary>(this.url(id) + '/quotes', input);
  }
  decideQuote(id: number, quoteId: number, accept: boolean) {
    return this.http.post<ContractSummary>(
      this.url(id) + '/quotes/' + quoteId + (accept ? '/accept' : '/reject'),
      {},
    );
  }
  scheduleVisit(id: number, input: VisitInput) {
    return this.http.post<ContractSummary>(this.url(id) + '/visit', input);
  }
  completeVisit(id: number) {
    return this.http.post<ContractSummary>(this.url(id) + '/visit/complete', {});
  }
}
