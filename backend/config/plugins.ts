export default (env) => ({

// ...
  email: {
    config: {
      provider: 'nodemailer', // For community providers pass the full package name (e.g. provider: 'strapi-provider-email-mandrill')
      providerOptions: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, 
        auth: {
          user: '482200105@alumnos.utzac.edu.mx',
          pass: 'fybu nqfw xrun dxak', 
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
      settings: {
        defaultFrom: '482200105@alumnos.utzac.edu.mx',
        defaultReplyTo: '482200105@alumnos.utzac.edu.mx',
      },
    },
  },
  // ...

});
