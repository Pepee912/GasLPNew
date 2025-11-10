/**
 * cliente router
 */

import { factories } from '@strapi/strapi';

// export default factories.createCoreRouter('api::cliente.cliente');

export default{
    routes:[
        {
            method:'GET',
            path:'/clientes',
            handler:'cliente.find',
        },
        {
            method:'GET',
            path:'/clientes/:id',
            handler:'cliente.findOne',
        },
        {
            method:'POST',
            path:'/clientes',
            handler:'cliente.create',
        },
        {
            method:'PUT',
            path:'/clientes/:id',
            handler:'cliente.update',
        },
        {
            method:'DELETE',
            path:'/clientes/:id',
            handler:'cliente.delete',
        },
        {
            method:'GET',
            path:'/clientes/telefono/:id',
            handler:'cliente.findbByPhone',
        }
    ]
}
