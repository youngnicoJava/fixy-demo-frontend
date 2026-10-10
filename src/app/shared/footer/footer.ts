import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  Users,
  Building2,
} from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();

  readonly socialLinks = [
    { name: 'Instagram', icon: Instagram, url: '/demo-info' },
    { name: 'Facebook', icon: Facebook, url: '/demo-info' },
    { name: 'LinkedIn', icon: Linkedin, url: '/demo-info' },
    { name: 'Twitter', icon: Twitter, url: '/demo-info' },
  ];

  readonly MailIcon = Mail;
  readonly PhoneIcon = Phone;
  readonly MapPinIcon = MapPin;
  readonly ShieldIcon = Shield;
  readonly AwardIcon = Award;
  readonly UsersIcon = Users;
  readonly Building2Icon = Building2;

  // Datos de la empresa (mock - modificables)
  readonly companyData = {
    name: 'Fixy · demo de portfolio',
    cuit: '00-00000000-0',
    address: 'Buenos Aires · dirección ficticia de demostración',
    phone: '+54 11 5555-0100 · ficticio',
    email: 'contacto@fixy.demo',
    inscription: 'Sin registro legal en esta demo',
    afip: 'Datos ficticios, sin operaciones reales',
  };
}


