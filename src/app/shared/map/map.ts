import {Component,Input,Output,EventEmitter,ChangeDetectionStrategy} from '@angular/core';
@Component({selector:'app-map',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<div class="demo-map"><strong>Ubicación de demostración</strong><p>Sin mapas ni geolocalización externa. Elegí una dirección ficticia con el buscador.</p><button type="button" (click)="select()">Usar ubicación demo en Buenos Aires</button><small>Latitud {{latitude ?? -34.6037}} · Longitud {{longitude ?? -58.3816}}</small></div>`,
 styles:[`.demo-map{min-height:180px;display:grid;place-content:center;gap:12px;padding:24px;border-radius:16px;background:#edf2ed;color:#294b36;text-align:center}.demo-map p{margin:0;max-width:400px}.demo-map button{padding:12px;border:0;border-radius:8px;background:#47745b;color:white;cursor:pointer}.demo-map small{font-size:12px}`]})
export class MapComponent {
 @Input() latitude?:number;@Input() longitude?:number;
 @Output() locationSelected=new EventEmitter<{latitude:number;longitude:number;fromMap?:boolean}>();
 select(){this.locationSelected.emit({latitude:-34.6037,longitude:-58.3816,fromMap:true});}
}
