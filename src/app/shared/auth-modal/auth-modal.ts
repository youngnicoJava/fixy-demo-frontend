import { Component, inject } from '@angular/core';
import { AuthModalService } from '../../core/services/auth.modal.service';
import { Router } from '@angular/router';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-auth-modal',
  imports: [],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModal {
  //DI
  readonly authModal = inject(AuthModalService);
  private readonly router = inject(Router);
  private readonly locationservice = inject(LocationService);

  close(): void {
    this.authModal.hide();
  }

  //navigate
  goToRegister(): void {
    this.authModal.hide();

    this.router.navigate(['/register']);
  }
}
