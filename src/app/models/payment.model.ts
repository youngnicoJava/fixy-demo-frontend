import { PaymentStatus } from './enums/payment-status.enum';

export interface CreatePaymentRequest {
  serviceRequestId: number;
}

export interface PaymentResponse {
  id: number;
  serviceRequestId: number;
  amount: number;
  feeAmount: number;
  status: PaymentStatus;
  checkoutUrl: string | null;
  agreementId: number | null;
  protectionEndsAt: string | null;
  heldAt: string | null;
  settledAt: string | null;
}

export interface PaymentEventRequest {
  paymentId: number;
  providerPaymentId: string;
  status: PaymentStatus;
}

export interface MpPreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
}

export interface ContractPaymentItem { agreementId:number|null; serviceRequestId:number; title:string; workerName:string; totalAmount:number; payment:PaymentResponse|null; }
