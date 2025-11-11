/**
 * cliente controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::cliente.cliente',{
    
    async findbByPhone(ctx){
        console.log("Teléfono a buscar: ", ctx.params.id);

        const cliente = await strapi.documents('api::cliente.cliente').findFirst({
            populate: {
                domicilios: true
            },

            filters: {
                telefono: {
                    $eq: ctx.params.id
                }
            }
        })

        if(!cliente){
            return ctx.throw(404, 'Cliente no encontrado');
        }

        console.log("Cliente encontrado: ", cliente);
        return cliente;
    }
});