import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env') });

console.log('=== TESTE DE CREDENCIAIS CLOUDINARY ===\n');

// Verificar credenciais carregadas
const credentials = {
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET ? '✓ CARREGADO' : '✗ NÃO ENCONTRADO'
};

console.log('Credenciais carregadas:');
console.log(JSON.stringify(credentials, null, 2));

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Testar API
async function testCloudinary() {
  try {
    console.log('\n📤 Testando upload de arquivo vazio...');
    
    const result = await cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'acessoia/audio',
        public_id: 'test-' + Date.now()
      },
      (error, result) => {
        if (error) {
          console.error('\n ERRO NO UPLOAD:');
          console.error('Message:', error.message);
          console.error('HTTP Code:', (error as any).http_code);
          console.error('Error:', error);
          process.exit(1);
        } else {
          console.log('\n UPLOAD BEM-SUCEDIDO!');
          console.log('Public ID:', result?.public_id);
          console.log('URL:', result?.secure_url);
          
          // Deletar arquivo de teste
          cloudinary.uploader.destroy(result!.public_id, (err, res) => {
            if (!err) {
              console.log('✓ Arquivo de teste deletado');
            }
            process.exit(0);
          });
        }
      }
    );

    // Enviar dados vazios
    result.end(Buffer.from('test'));
  } catch (error) {
    console.error('Erro ao testar:', error);
    process.exit(1);
  }
}

testCloudinary();
