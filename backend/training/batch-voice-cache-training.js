"use strict";
/**
 * SCRIPT DE PRÉ-TREINO RÁPIDO PARA VOICECACHE v2
 *
 * MELHORIAS:
 * ✅ Filtra perguntas inúteis/genéricas
 * ✅ Valida semântica (pergunta + resposta faz sentido?)
 * ✅ Salva MÚLTIPLAS perguntas para cada resposta
 * ✅ Relatório de qualidade do FAQ
 *
 * USO:
 * npx ts-node backend/training/batch-voice-cache-training.ts
 *
 * TEMPO ESTIMADO:
 * - 10 respostas únicas = ~5-10 minutos
 * - 20 respostas únicas = ~10-20 minutos
 * - 50 respostas únicas = ~30-60 minutos
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../src/lib/prisma");
const tts_1 = require("../src/ai/tts");
const faq_1 = require("../src/data/faq");
const perf_hooks_1 = require("perf_hooks");
const string_similarity_1 = require("string-similarity");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
/**
 * Perguntas genéricas que não devem ser usadas como chave
 */
const PERGUNTAS_GENERICAS = new Set([
    'explique',
    'não entendi',
    'como assim',
    'pode explicar melhor',
    'pode explicar melhor?',
    'repete isso',
    'repete',
    'entendi',
    'mas como',
    'e depois',
    'e aí',
    'what',
    'ok',
    'tá bom',
    'ué',
    'hein?',
    'como',
    'quais',
    'quando',
    'onde',
    'por quê',
    'quanto',
    'quem',
    'como assim',
    'quanto custaria',
    'qual seria',
    'e se',
    'dá para',
    'é possível',
    'consegue',
    'conseguir',
    'dar',
    'fazer',
    'ajuda',
    'me ajuda',
    'socorro',
    'qual a diferença',
    'qual é a diferença',
    'o que é',
    'qual é',
    'quais são os',
    'como funciona',
    'como funciona o',
    'como funciona a',
    'como funciona os',
]);
/**
 * Verifica se uma pergunta é válida/específica
 */
function isPerguntaValida(pergunta) {
    const normalized = pergunta.toLowerCase().trim();
    // Se a pergunta inteira está na lista, rejeita
    if (PERGUNTAS_GENERICAS.has(normalized)) {
        return false;
    }
    // Se é muito curta (<5 caracteres), rejeta
    if (normalized.length < 5) {
        return false;
    }
    // Se tem pouquíssimas palavras, pode ser genérica
    const palavras = normalized.split(/\s+/);
    if (palavras.length < 2) {
        return false;
    }
    // Se começa com genéricas, rejeta
    const inicio = palavras.slice(0, 3).join(' ');
    if (PERGUNTAS_GENERICAS.has(inicio)) {
        return false;
    }
    return true;
}
/**
 * Calcula relevância da pergunta em relação à resposta (0-1)
 */
function calcularRelevancia(pergunta, resposta) {
    const similarity = (0, string_similarity_1.compareTwoStrings)(pergunta.toLowerCase(), resposta.toLowerCase());
    // Se tem palavras-chave da resposta, aumenta relevância
    const palavrasResposta = resposta.toLowerCase().split(/\s+/);
    const palavrasPergunta = pergunta.toLowerCase().split(/\s+/);
    let match = 0;
    for (const pp of palavrasPergunta) {
        if (palavrasResposta.some(pr => pr.includes(pp) || pp.includes(pr))) {
            match++;
        }
    }
    const keywordBonus = (match / Math.max(palavrasPergunta.length, 1)) * 0.3;
    return Math.min(similarity + keywordBonus, 1);
}
/**
 * Extrai respostas únicas do FAQ com validação de qualidade
 */
function extrairRespostasUnicas() {
    const respostasMap = new Map();
    Object.entries(faq_1.faq).forEach(([_chave, itens]) => {
        itens.forEach(item => {
            const respostaNormalizada = item.answer.toLowerCase().trim();
            if (!respostasMap.has(respostaNormalizada)) {
                const perguntasValidas = item.questions.filter(p => isPerguntaValida(p));
                const perguntasRejeitadas = item.questions.filter(p => !isPerguntaValida(p));
                const relevanciaArray = perguntasValidas.map(p => calcularRelevancia(p, item.answer));
                const mediaRelevancia = relevanciaArray.length > 0
                    ? relevanciaArray.reduce((a, b) => a + b, 0) / relevanciaArray.length
                    : 0;
                respostasMap.set(respostaNormalizada, {
                    resposta: item.answer,
                    perguntas: item.questions,
                    perguntasValidas,
                    perguntasRejeitadas,
                    categoria: item.category,
                    mediaRelevancia
                });
            }
            else {
                const existente = respostasMap.get(respostaNormalizada);
                const novasPerguntas = item.questions.filter(p => !existente.perguntas.includes(p));
                existente.perguntas = [...existente.perguntas, ...novasPerguntas];
                const novasPerguntasValidas = novasPerguntas.filter(p => isPerguntaValida(p));
                const novasPerguntasRejeitadas = novasPerguntas.filter(p => !isPerguntaValida(p));
                existente.perguntasValidas = [...existente.perguntasValidas, ...novasPerguntasValidas];
                existente.perguntasRejeitadas = [...existente.perguntasRejeitadas, ...novasPerguntasRejeitadas];
            }
        });
    });
    return Array.from(respostasMap.values());
}
/**
 * Gera áudio com retry automático
 */
async function gerarAudioComRetry(texto, tentativasRestantes = 3) {
    try {
        const audioUrl = await (0, tts_1.gerarAudio)(texto, true); // forçar geração
        if (audioUrl) {
            return audioUrl;
        }
        if (tentativasRestantes > 0) {
            console.warn(`⚠️  Falha ao gerar áudio, tentando novamente... (${tentativasRestantes} tentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s
            return gerarAudioComRetry(texto, tentativasRestantes - 1);
        }
        return null;
    }
    catch (error) {
        console.error(`❌ Erro ao gerar áudio após retries:`, error);
        return null;
    }
}
/**
 * Executa o treino
 */
async function executarTreino() {
    try {
        console.log('\n' + '═'.repeat(70));
        console.log('  🎯 TREINO RÁPIDO DE VOICECACHE');
        console.log('═'.repeat(70) + '\n');
        // ============ PASSO 1: EXTRAIR RESPOSTAS ÚNICAS ============
        console.log('📋 PASSO 1: Extraindo respostas únicas do FAQ...');
        const respostasUnicas = extrairRespostasUnicas();
        console.log(`   ✓ Total de respostas únicas encontradas: ${respostasUnicas.length}\n`);
        let totalPerguntasOriginais = 0;
        let totalPerguntasValidas = 0;
        let totalPerguntasRejeitadas = 0;
        let respostasComBaixaRelevancia = 0;
        respostasUnicas.forEach((r, i) => {
            totalPerguntasOriginais += r.perguntas.length;
            totalPerguntasValidas += r.perguntasValidas.length;
            totalPerguntasRejeitadas += r.perguntasRejeitadas.length;
            if (r.mediaRelevancia < 0.5) {
                respostasComBaixaRelevancia++;
            }
            const relevanciaIcon = r.mediaRelevancia > 0.7 ? '✅' : r.mediaRelevancia > 0.5 ? '⚠️' : '❌';
            console.log(`   ${i + 1}. [${r.categoria}] Relevância: ${relevanciaIcon} ${(r.mediaRelevancia * 100).toFixed(0)}%`);
            console.log(`      Resposta: ${r.resposta.substring(0, 50)}...`);
            console.log(`      Perguntas: ${r.perguntasValidas.length} válidas de ${r.perguntas.length} total`);
            if (r.perguntasRejeitadas.length > 0 && r.perguntasRejeitadas.length <= 3) {
                console.log(`      Rejeitadas: ${r.perguntasRejeitadas.map(p => `"${p.substring(0, 20)}..."`).join(', ')}`);
            }
            else if (r.perguntasRejeitadas.length > 3) {
                console.log(`      Rejeitadas: ${r.perguntasRejeitadas.length} perguntas genéricas`);
            }
            console.log('');
        });
        console.log('\n📊 QUALIDADE DO FAQ:');
        console.log(`   Total de perguntas originais: ${totalPerguntasOriginais}`);
        console.log(`   ✅ Perguntas válidas: ${totalPerguntasValidas} (${((totalPerguntasValidas / totalPerguntasOriginais) * 100).toFixed(1)}%)`);
        console.log(`   ❌ Perguntas genéricas/rejeitadas: ${totalPerguntasRejeitadas} (${((totalPerguntasRejeitadas / totalPerguntasOriginais) * 100).toFixed(1)}%)`);
        console.log(`   ⚠️  Respostas com baixa relevância (<50%): ${respostasComBaixaRelevancia}`);
        console.log('');
        // ============ PASSO 2: VERIFICAR JÁ EXISTENTES ============
        console.log('\n📊 PASSO 2: Verificando o que já está em VoiceCache...');
        const jáExistentes = await prisma_1.prisma.voiceCache.findMany({
            select: { question: true }
        });
        const jáExistentesSet = new Set(jáExistentes.map(v => v.question.toLowerCase()));
        console.log(`   ✓ Áudios já em cache: ${jáExistentes.length}`);
        // ============ PASSO 3: GERAR ÁUDIOS PARA RESPOSTAS ============
        console.log('\n🎙️  PASSO 3: Gerando áudios para respostas...');
        console.log(`   Total a processar: ${respostasUnicas.length} respostas\n`);
        let sucesso = 0;
        let falhas = 0;
        let saltados = 0;
        let perguntasIndexadas = 0;
        const timeStart = perf_hooks_1.performance.now();
        for (let i = 0; i < respostasUnicas.length; i++) {
            const resposta = respostasUnicas[i];
            const numero = i + 1;
            // Se não tem perguntas válidas, pula
            if (resposta.perguntasValidas.length === 0) {
                console.log(`   [${numero}/${respostasUnicas.length}] ⏭️  Pulando (nenhuma pergunta válida)`);
                saltados++;
                continue;
            }
            // Usar primeira pergunta válida como referência
            const perguntaReferencia = resposta.perguntasValidas[0];
            const perguntaNormalizada = perguntaReferencia
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\w\s]/g, '')
                .trim();
            if (jáExistentesSet.has(perguntaNormalizada)) {
                console.log(`   [${numero}/${respostasUnicas.length}] ⏭️  Pulando (já existe): "${perguntaReferencia.substring(0, 50)}..."`);
                saltados++;
                continue;
            }
            console.log(`\n   [${numero}/${respostasUnicas.length}] 🔄 Gerando áudio para ${resposta.perguntasValidas.length} perguntas`);
            console.log(`   Pergunta referência: "${perguntaReferencia.substring(0, 60)}..."`);
            console.log(`   Resposta: "${resposta.resposta.substring(0, 80)}..."`);
            const audioUrl = await gerarAudioComRetry(resposta.resposta);
            if (audioUrl) {
                // ✅ SALVOU O ÁUDIO - AGORA INDEXAR TODAS AS PERGUNTAS VÁLIDAS
                console.log(`   ✅ Sucesso! Indexando ${resposta.perguntasValidas.length} perguntas...`);
                // Salvar cada pergunta válida em VoiceCache apontando para o mesmo áudio
                for (const pergunta of resposta.perguntasValidas) {
                    try {
                        const pNorm = pergunta
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^\w\s]/g, '')
                            .trim();
                        // Não salvar se já existe
                        if (!jáExistentesSet.has(pNorm)) {
                            await prisma_1.prisma.voiceCache.create({
                                data: {
                                    question: pNorm,
                                    audioUrl,
                                    voiceId: 'elevenlabs_default',
                                    usageCount: 1,
                                    lastUsed: new Date()
                                }
                            });
                            perguntasIndexadas++;
                            jáExistentesSet.add(pNorm);
                        }
                    }
                    catch (err) {
                        // Ignorar violação de UNIQUE constraint
                        if (err.code !== 'P2002') {
                            console.error(`      ❌ Erro ao salvar pergunta "${pergunta}":`, err);
                        }
                    }
                }
                console.log(`      ✅ ${resposta.perguntasValidas.length} perguntas indexadas com sucesso`);
                sucesso++;
                // Esperar um pouco entre requisições para não sobrecarregar ElevenLabs
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            else {
                console.log(`   ❌ Falha ao gerar áudio`);
                falhas++;
            }
        }
        // ============ PASSO 4: ESTATÍSTICAS FINAIS ============
        const timeEnd = perf_hooks_1.performance.now();
        const tempoDecorrido = ((timeEnd - timeStart) / 1000 / 60).toFixed(1); // em minutos
        console.log('\n' + '═'.repeat(70));
        console.log('  📊 RESULTADO DO TREINO');
        console.log('═'.repeat(70) + '\n');
        console.log(`🎙️  Respostas com áudio gerado: ${sucesso}`);
        console.log(`❌ Respostas falhadas: ${falhas}`);
        console.log(`⏭️  Respostas puladas: ${saltados}`);
        console.log(`✅ Total de perguntas indexadas em VoiceCache: ${perguntasIndexadas}`);
        console.log(`\n⏱️  Tempo total: ${tempoDecorrido} minutos`);
        console.log(`📈 Taxa de sucesso: ${sucesso > 0 ? ((sucesso / (sucesso + falhas)) * 100).toFixed(1) : '0'}%`);
        // ============ PASSO 5: VERIFICAR CACHE FINAL ============
        console.log('\n🔍 PASSO 5: Verificando VoiceCache após treino...');
        const stats = await prisma_1.prisma.voiceCache.aggregate({
            _count: true,
            _sum: { usageCount: true }
        });
        console.log(`   Total de perguntas em VoiceCache: ${stats._count}`);
        console.log(`   Total de usos registrados: ${stats._sum.usageCount || 0}`);
        console.log('\n' + '═'.repeat(70));
        console.log('  ✨ TREINO CONCLUÍDO!');
        console.log('═'.repeat(70) + '\n');
        console.log('📈 RESUMO DE QUALIDADE:');
        console.log(`   ✅ Perguntas válidas capturadas: ${totalPerguntasValidas}`);
        console.log(`   ⚠️  Perguntas genéricas ignoradas: ${totalPerguntasRejeitadas}`);
        console.log(`   📊 Cobertura: ${((totalPerguntasValidas / totalPerguntasOriginais) * 100).toFixed(1)}% do FAQ`);
        console.log('\n💡 Próximos passos:');
        console.log('   1. Revise o FAQ para adicionar mais perguntas específicas');
        console.log('   2. Teste o sistema no evento com perguntas variadas');
        console.log('   3. Monitore /admin/voice-cache/stats para ver a reutilização');
        console.log('   4. Adicione mais áudios conforme novas respostas aparecerem');
        console.log('\n');
    }
    catch (error) {
        console.error('❌ Erro durante o treino:', error);
        process.exit(1);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
// Executar treino
executarTreino();
