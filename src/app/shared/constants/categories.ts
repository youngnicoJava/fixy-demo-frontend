import { Category } from '../../models/enums/category.enum';

import { IconType } from '@ng-icons/core';

import {
  phosphorWrenchDuotone,
  phosphorLightningDuotone,
  phosphorSnowflakeDuotone,
  phosphorPaintBrushDuotone,
  phosphorKeyDuotone,
  phosphorHammerDuotone,
  phosphorDesktopDuotone,
} from '@ng-icons/phosphor-icons/duotone';

export interface CategoryOption {
  value: Category;
  label: string;
  description: string;
  icon: IconType;
  commonServices: string[];
}

export const CATEGORIES: CategoryOption[] = [
  {
    value: Category.PLOMERIA,
    label: 'Plomería',
    description: 'Cañerías, pérdidas, instalaciones sanitarias',
    icon: phosphorWrenchDuotone,
    commonServices: [
      'Destapar cañería',
      'Reparar pérdida de agua',
      'Destapar inodoro',
      'Reparar grifería',
    ],
  },

  {
    value: Category.ELECTRICIDAD,
    label: 'Electricidad',
    description: 'Instalaciones, cortocircuitos y tableros',
    icon: phosphorLightningDuotone,
    commonServices: [
      'Salta la térmica',
      'Reparar cortocircuito',
      'Reparar enchufe',
      'Hacer instalación eléctrica',
    ],
  },

  {
    value: Category.AIRE_ACONDICIONADO,
    label: 'Aire acondicionado',
    description: 'Instalación, limpieza y reparación de equipos',
    icon: phosphorSnowflakeDuotone,
    commonServices: [
      'Mantenimiento de aire acondicionado',
      'No enfría',
      'Pierde agua',
      'Instalar aire acondicionado',
    ],
  },

  {
    value: Category.PINTURA,
    label: 'Pintura',
    description: 'Interiores, exteriores y revestimientos',
    icon: phosphorPaintBrushDuotone,
    commonServices: [
      'Pintar una habitación',
      'Pintar un departamento',
      'Pintar paredes y techos',
      'Reparar humedad y pintar',
    ],
  },

  {
    value: Category.CERRAJERIA,
    label: 'Cerrajería',
    description: 'Cerraduras, llaves y puertas',
    icon: phosphorKeyDuotone,
    commonServices: [
      'Abrir una puerta',
      'Cambiar cerradura',
      'Reparar cerradura',
      'Cambiar cilindro',
    ],
  },

  {
    value: Category.HERRERIA,
    label: 'Herrería',
    description: 'Rejas, portones y estructuras metálicas',
    icon: phosphorHammerDuotone,
    commonServices: ['Reparar reja', 'Fabricar reja', 'Reparar portón', 'Fabricar portón'],
  },

  {
    value: Category.REPARACION_PC,
    label: 'Reparación de PC',
    description: 'Hardware, software y mantenimiento',
    icon: phosphorDesktopDuotone,
    commonServices: [
      'PC no enciende',
      'PC se sobrecalienta',
      'PC está lenta',
      'Diagnosticar falla de PC',
    ],
  },
];
