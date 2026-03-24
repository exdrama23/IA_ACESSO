import nodemailer from 'nodemailer';

const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  
  return user && 
         pass && 
         !user.includes('seu_email') && 
         !pass.includes('sua_senha');
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  try {
    
    if (!isEmailConfigured()) {
      console.error('[EMAIL] Credenciais não configuradas. Veja SETUP_EMAIL_GMAIL.md');
      throw new Error(
        'Serviço de email não configurado. ' +
        'Siga os passos em SETUP_EMAIL_GMAIL.md para configurar Gmail SMTP.'
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    
    <tr>
      <td style="background-color: #e50b5e; padding: 40px 30px; border-radius: 0 0 0 50px;">
        <div style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 20px; letter-spacing: 1px;">ACESSO.NET.BR</div>
        <div style="font-size: 24px; color: #ffffff; font-weight: bold; line-height: 1.3;">
          O seu código de<br>recuperação chegou.
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding: 35px 30px;">
        
        <p style="font-size: 16px; margin: 0 0 20px 0; color: #555555;">
          Olá, <strong style="color: #e50b5e;">Usuário</strong>.
        </p>
        
        <p style="font-size: 16px; margin: 0 0 30px 0; color: #555555; line-height: 1.5;">
          Você está recebendo este e-mail para redefinir sua senha. Para acessá-la, basta usar o código abaixo.
        </p>

        <div style="background-color: #f7f8fa; border-radius: 16px; padding-bottom: 30px; margin-bottom: 30px; overflow: hidden;">
          
          <div style="background-color: #e50b5e; color: #ffffff; font-weight: bold; font-size: 16px; padding: 12px 25px; border-radius: 0 20px 20px 0; display: inline-block; margin-bottom: 20px;">
            Código de segurança
          </div>

          <div style="text-align: center; padding: 10px 0;">
            <span style="font-size: 46px; font-weight: 900; color: #333333; letter-spacing: 10px;">${code}</span>
          </div>
          
          <div style="text-align: center; font-size: 14px; color: #888888; margin-top: 5px;">
            Este código expira em <strong>15 minutos</strong>
          </div>
        </div>

        <div style="background-color: #fff0f5; border-left: 4px solid #e50b5e; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; color: #444444; line-height: 1.6;">
            <strong style="color: #e50b5e;">Segurança:</strong> Nunca compartilhe este código com ninguém. A ACESSO.NET.BR nunca pedirá sua senha por mensagem.
          </p>
        </div>

        <p style="font-size: 14px; color: #999999; margin: 0; line-height: 1.5;">
          Se você não solicitou uma redefinição de senha, ignore este e-mail.
        </p>

      </td>
    </tr>

    <tr>
      <td style="background-color: #f9fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #aaaaaa; font-weight: bold;">
          © 2024 ACESSO.NET. Todos os direitos reservados.
        </p>
        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
          Este é um e-mail automático. Não responda a esta mensagem.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperação de Senha - ACESSO.NET.BR',
      html: htmlContent,
      text: `Seu código de recuperação de senha: ${code}\nEste código expira em 15 minutos.`
    });

    console.log(`[EMAIL] Código enviado com sucesso para: ${email}`);
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar email:', error);
    throw new Error(
      'Falha ao enviar email de recuperação. ' +
      'Verifique se as credenciais do Gmail estão configuradas corretamente no arquivo .env'
    );
  }
}

function getDisplayName(email: string, userName?: string | null): string {
  if (userName && userName.trim()) return userName.trim();

  const localPart = email.split('@')[0] || '';
  if (!localPart) return 'Usuário';

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export async function sendPasswordResetEmailWithName(
  email: string,
  code: string,
  userName?: string | null,
): Promise<void> {
  const displayName = getDisplayName(email, userName);
  const logoUrl = (process.env.EMAIL_LOGO_URL || '').trim();
  const hasLogoUrl = /^https?:\/\//.test(logoUrl);

  try {
    if (!isEmailConfigured()) {
      console.error('[EMAIL] Credenciais não configuradas. Veja SETUP_EMAIL_GMAIL.md');
      throw new Error(
        'Serviço de email não configurado. ' +
        'Siga os passos em SETUP_EMAIL_GMAIL.md para configurar Gmail SMTP.'
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    
    <tr>
      <td style="background-color: #e50b5e; padding: 40px 30px; border-radius: 0 0 0 50px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
          <tr>
            <td width="160" style="vertical-align: middle; padding-right: 16px;">
              ${hasLogoUrl
                ? `<img src="${logoUrl}" alt="ACESSO.NET" width="200" height="200" style="display: block; width: 200px; height: 200px; border: 0; object-fit: contain;">`
                : '<div style="width: 200px; height: 200px; background-color: rgba(255,255,255,0.2); border-radius: 12px;"></div>'}
            </td>
            <td style="vertical-align: middle;">
              <div style="font-size: 24px; color: #ffffff; font-weight: bold; line-height: 1.3;">
                O seu código de<br>recuperação chegou.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 35px 30px;">
        
        <p style="font-size: 16px; margin: 0 0 20px 0; color: #555555;">
          Olá, <strong style="color: #e50b5e;">${displayName}</strong>.
        </p>
        
        <p style="font-size: 16px; margin: 0 0 30px 0; color: #555555; line-height: 1.5;">
          Você está recebendo este e-mail para redefinir sua senha. Para acessá-la, basta usar o código abaixo.
        </p>

        <div style="background-color: #f7f8fa; border-radius: 16px; padding-bottom: 30px; margin-bottom: 30px; overflow: hidden;">
          
          <div style="background-color: #e50b5e; color: #ffffff; font-weight: bold; font-size: 16px; padding: 12px 25px; border-radius: 0 20px 20px 0; display: inline-block; margin-bottom: 20px;">
            Código de segurança
          </div>

          <div style="text-align: center; padding: 10px 0;">
            <span style="font-size: 46px; font-weight: 900; color: #333333; letter-spacing: 10px;">${code}</span>
          </div>
          
          <div style="text-align: center; font-size: 14px; color: #888888; margin-top: 5px;">
            Este código expira em <strong>15 minutos</strong>
          </div>
        </div>

        <div style="background-color: #fff0f5; border-left: 1px solid #fff0f5; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; color: #444444; line-height: 1.6;">
            <strong style="color: #e50b5e;">Segurança:</strong> Nunca compartilhe este código com ninguém. A ACESSO.NET.BR nunca pedirá sua senha por mensagem.
          </p>
        </div>

        <p style="font-size: 14px; color: #999999; margin: 0; line-height: 1.5;">
          Se você não solicitou uma redefinição de senha, ignore este e-mail.
        </p>

      </td>
    </tr>

    <tr>
      <td style="background-color: #f9fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #aaaaaa; font-weight: bold;">
          © 2026 ACESSO.NET.BR  Todos os direitos reservados.
        </p>
        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
          Este é um e-mail automático. Não responda a esta mensagem.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperação de Senha - ACESSO.NET.BR',
      html: htmlContent,
      text: `Olá, ${displayName}. Seu código de recuperação de senha: ${code}\nEste código expira em 15 minutos.`,
    });

    console.log(`[EMAIL] Código enviado com sucesso para: ${email}`);
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar email:', error);
    throw new Error(
      'Falha ao enviar email de recuperação. ' +
      'Verifique se as credenciais do Gmail estão configuradas corretamente no arquivo .env'
    );
  }
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[EMAIL] Conexão verificada com sucesso');
    return true;
  } catch (error) {
    console.error('[EMAIL] Erro ao verificar conexão:', error);
    return false;
  }
}
