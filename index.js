const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Buat folder auth jika belum ada
const authFolder = './auth_info';
if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
}

// Konfigurasi
const config = {
    prefix: '!',
    botName: 'PanelBot',
    ownerNumber: '62812xxxxxxxx' // Ganti dengan nomormu
};

async function connectToWhatsApp() {
    console.log('🚀 Memulai Bot WhatsApp di Panel...');
    console.log('📁 Auth folder:', path.resolve(authFolder));
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        
        const sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            browser: ['Panel Bot', 'Chrome', '1.0.0'],
            logger: {
                level: 'error', // Kurangi log untuk hemat resource
                printQRInTerminal: true
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // Simpan QR code ke file (untuk panel yang tidak support terminal)
            if (qr) {
                console.log('\n=== QR CODE UNTUK WHATSAPP ===');
                qrcode.generate(qr, { small: true });
                console.log('=================================\n');
                
                // Simpan QR ke file untuk diakses via browser
                fs.writeFileSync('qrcode.txt', qr);
                console.log('QR code disimpan di qrcode.txt');
                console.log('Silakan scan QR code di atas dengan WhatsApp');
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('⚠️ Koneksi terputus...');
                
                if (shouldReconnect) {
                    console.log('🔄 Mencoba reconnect dalam 5 detik...');
                    setTimeout(() => connectToWhatsApp(), 5000);
                }
            } 
            else if (connection === 'open') {
                console.log('✅ Bot berhasil terhubung!');
                console.log(`🤖 Nama: ${sock.user?.name || 'Tidak diketahui'}`);
                console.log(`📱 Nomor: ${sock.user?.id?.replace('@s.whatsapp.net', '')}`);
                console.log('📝 Bot siap menerima pesan...');
                
                // Hapus file QR setelah connect
                if (fs.existsSync('qrcode.txt')) {
                    fs.unlinkSync('qrcode.txt');
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
        // Handler pesan masuk
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            
            // Skip jika pesan dari status atau broadcast
            if (!m.message || m.key.remoteJid === 'status@broadcast') return;
            
            // Proses pesan
            await handleMessage(sock, m);
        });
        
        // Keep alive
        setInterval(() => {
            if (sock) {
                sock.sendPresenceUpdate('available');
            }
        }, 60000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('🔄 Restarting in 10 seconds...');
        setTimeout(() => connectToWhatsApp(), 10000);
    }
}

// Handler pesan sederhana
async function handleMessage(sock, m) {
    try {
        const from = m.key.remoteJid;
        const sender = m.pushName || 'Pengguna';
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        
        // Skip pesan dari bot sendiri
        if (m.key.fromMe) return;
        
        console.log(`📩 Pesan dari ${sender}: ${text.substring(0, 50)}...`);
        
        // Command handler
        if (text.startsWith(config.prefix)) {
            const command = text.slice(config.prefix.length).toLowerCase().split(' ')[0];
            
            switch(command) {
                case 'ping':
                    await sock.sendMessage(from, { text: '🏓 Pong!' });
                    break;
                    
                case 'menu':
                    await sock.sendMessage(from, {
                        text: `📋 *Menu Bot*\n\n` +
                              `Halo ${sender}! Saya ${config.botName}\n\n` +
                              `Perintah yang tersedia:\n` +
                              `• ${config.prefix}ping - Test bot\n` +
                              `• ${config.prefix}menu - Tampilkan menu\n` +
                              `• ${config.prefix}owner - Info pemilik\n` +
                              `• ${config.prefix}info - Info bot`
                    });
                    break;
                    
                case 'owner':
                    await sock.sendMessage(from, {
                        text: `👤 *Owner Bot*\n\n` +
                              `Nomor: ${config.ownerNumber}\n` +
                              `Hosting: Petercolanty Panel`
                    });
                    break;
                    
                case 'info':
                    await sock.sendMessage(from, {
                        text: `🤖 *Info Bot*\n\n` +
                              `Nama: ${config.botName}\n` +
                              `Prefix: ${config.prefix}\n` +
                              `Status: Aktif ✅\n` +
                              `Host: Panel Petercolanty`
                    });
                    break;
                    
                default:
                    await sock.sendMessage(from, {
                        text: `❌ Perintah tidak dikenali\n` +
                              `Ketik ${config.prefix}menu untuk bantuan`
                    });
            }
        } 
        // Auto reply untuk pesan tertentu
        else if (text.toLowerCase().includes('halo') || text.toLowerCase().includes('hai')) {
            await sock.sendMessage(from, {
                text: `Halo ${sender}! 👋\nAda yang bisa saya bantu?\nKetik ${config.prefix}menu untuk melihat perintah.`
            });
        }
        else if (text.toLowerCase().includes('bot')) {
            await sock.sendMessage(from, {
                text: `Ya, saya ${config.botName}!\nBot WhatsApp yang berjalan di panel hosting.`
            });
        }
        
    } catch (error) {
        console.error('Error handling message:', error);
    }
}

// Mulai bot
connectToWhatsApp();

// Tangani shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Bot dihentikan...');
    process.exit(0);
});
