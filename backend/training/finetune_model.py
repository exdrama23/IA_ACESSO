from sentence_transformers import SentenceTransformer, losses
import json
import os

model_name = 'all-MiniLM-L6-v2'
model = SentenceTransformer(model_name)

dataset_path = 'training_data/acesso_training.json'

if not os.path.exists('training_data'):
    os.makedirs('training_data')

if not os.path.exists(dataset_path):
    example_data = [
        {
            "pergunta": "Como posso contratar fibra?",
            "categoria": "Internet Fibra",
            "variacoes": [
                "Como faço contrato de fibra?",
                "Preciso de internet fibra",
                "Qual é o processo pra contratar?",
                "Como contrato fibra da acesso?"
            ]
        },
        {
            "pergunta": "Qual o valor da fibra?",
            "categoria": "Internet Fibra",
            "variacoes": [
                "Quanto custa a fibra?",
                "Qual é o preço?",
                "Qual o valor da internet fibra?",
                "Qual é o custo?"
            ]
        }
    ]
    with open(dataset_path, 'w', encoding='utf-8') as f:
        json.dump(example_data, f, indent=4, ensure_ascii=False)

train_examples = []
with open(dataset_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
    for item in data:
        base_question = item['pergunta']
        for variation in item['variacoes']:
            from sentence_transformers import InputExample
            train_examples.append(InputExample(texts=[base_question, variation], label=1.0))

train_dataloader = None
from torch.utils.data import DataLoader
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)

train_loss = losses.CosineSimilarityLoss(model)

print(f"Iniciando Fine-tuning do modelo {model_name}...")
model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=3,
    warmup_steps=100,
    show_progress_bar=True
)

output_path = 'models/acesso-embeddings-v1'
model.save(output_path)
print(f"Modelo treinado salvo em: {output_path}")
