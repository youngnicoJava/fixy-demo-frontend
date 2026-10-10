import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Users,
  CreditCard,
  Star,
  Shield,
  ArrowRight,
  Home,
  Wrench,
  Info,
  Phone,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from 'lucide-angular';
import { FooterComponent } from '../../shared/footer/footer';
import { WorkerInfoModalComponent } from '../../shared/worker-info-modal/worker-info-modal';
import { WorkerInfoModalService } from '../../core/services/worker-info-modal.service';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-worker-info',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    FooterComponent,
    WorkerInfoModalComponent,
    ScrollRevealDirective,
  ],
  templateUrl: './worker-info.html',
  styleUrl: './worker-info.scss',
})
export class WorkerInfoComponent {
  

  readonly modalService = inject(WorkerInfoModalService);

  readonly UsersIcon = Users;
  readonly CreditCardIcon = CreditCard;
  readonly StarIcon = Star;
  readonly ShieldIcon = Shield;
  readonly ArrowRightIcon = ArrowRight;
  readonly HomeIcon = Home;
  readonly WrenchIcon = Wrench;
  readonly InfoIcon = Info;
  readonly PhoneIcon = Phone;
  readonly InstagramIcon = Instagram;
  readonly FacebookIcon = Facebook;
  readonly LinkedinIcon = Linkedin;
  readonly TwitterIcon = Twitter;
}
