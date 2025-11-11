/**
 * servicio router
 */

import { factories } from '@strapi/strapi';
import path from 'path';

export default {
  routes: [
    {
      method: 'GET',
      path: '/servicios',
      handler: 'servicio.find',
    },
    {
      method: 'GET',
      path: '/servicios/hoy',
      handler: 'servicio.getServiciosHoy',
    },
    {
      method: 'GET',
      path: '/serviciosbyruta/:documentId',
      handler: 'servicio.getServiciosByRuta',
    },
    {
      method: 'GET',
      path: '/servicios/:id',
      handler: 'servicio.findOne',
    },
    {
      method: 'POST',
      path: '/servicios',
      handler: 'servicio.create',
    },
    {
      method: 'PUT',
      path: '/servicios/:id',
      handler: 'servicio.update',
    },
    {
      method: 'DELETE',
      path: '/servicios/:id',
      handler: 'servicio.delete',
    },
  ],
};
