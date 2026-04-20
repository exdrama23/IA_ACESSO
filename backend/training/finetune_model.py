from sentence_transformers import SentenceTransformer, losses, InputExample
import json
import os
from torch.utils.data import DataLoader

model_name = 'all-MiniLM-L6-v2'
model = SentenceTransformer(model_name)

dataset_path = 'training_data/acesso_training.json'
chat_history_path = 'training_data/chat_history_export.json'

train_examples = []

# Carregar dados estruturados do FAQ
if os.path.exists(dataset_path):
    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for item in data:
            base_question = item['pergunta']
            for variation in item['variacoes']:
                train_examples.append(InputExample(texts=[base_question, variation], label=1.0))

# Carregar dados reais do histórico de chat
if os.path.exists(chat_history_path):
    print(f"Carregando {chat_history_path} para treinamento especializado...")
    with open(chat_history_path, 'r', encoding='utf-8') as f:
        chat_data = json.load(f)
        for item in chat_data:
            # Aqui podemos adicionar lógica para parear perguntas reais com o FAQ base
            # Por enquanto, usamos a pergunta real para fortalecer a auto-similaridade do modelo
            train_examples.append(InputExample(texts=[item['pergunta'], item['pergunta']], label=1.0))

if not train_examples:
    print("Nenhum dado de treinamento encontrado.")
    exit()

train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)
train_loss = losses.CosineSimilarityLoss(model)

print(f"Iniciando Fine-tuning especializado Acesso.net (Exemplos: {len(train_examples)})...")
model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=len(train_dataloader) // 10,
    show_progress_bar=True
)

output_path = 'models/acesso-embeddings-v2'
model.save(output_path)
print(f"Modelo de alta precisao salvo em: {output_path}")
