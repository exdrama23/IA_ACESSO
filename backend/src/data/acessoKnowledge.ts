// backend/src/data/acessoKnowledge.ts

export const KNOWLEDGE_VERSION = "2024-05-23-V1";

export interface Plan {
  name: string;
  price: number;
  upload: string;
  wifi: string;
  profile: string;
}

export const acessoKnowledge = {
  metadata: {
    companyName: "ACESSO.NET (JF Soluções Informática LTDA)",
    yearsInMarket: 23,
    headquarters: "Estância, Sergipe",
    motto: "A melhor internet de Sergipe",
    cityNickname: "Estância, a Cidade Jardim (título de Dom Pedro II)",
    culturalContext: "Berço do tradicional Barco de Fogo"
  },
  
  about: `A ACESSO.NET é uma empresa com 23 anos de história, pioneira absoluta no município de Estância. Atuamos desde a era das conexões via rádio e cabos metálicos até a moderna infraestrutura 100% fibra óptica pura. Somos reconhecidos pela resiliência e por ditar o ritmo da digitalização regional, garantindo indicadores de conectividade comparáveis aos de grandes centros metropolitanos.`,

  history: {
    pioneerism: "Primeira empresa a oferecer internet de alta capacidade em Estância.",
    evolution: "Transição completa da planta externa (OSP) de rádio/cobre para Fibra Óptica FTTH.",
    impact: "Espinha dorsal crítica para o desenvolvimento econômico, governamental e social da região."
  },

  coverage: [
    "Estância (Sede)", "Praia do Abaís", "Praia do Saco", "Porto do Mato", 
    "Santa Luzia do Itanhy", "Aracaju", "Malhador", "Riachuelo", 
    "Moita Bonita", "Santa Rosa de Lima", "Divina Pastora", "Siriri"
  ],

  technology: {
    type: "FTTH (Fiber to the Home) - Fibra até a residência",
    infrastructure: "Rede 100% fibra óptica pura (vidro/plástico), imune a interferências eletromagnéticas, radiofrequências e oxidação.",
    equipment: "Roteadores Wi-Fi 6 (Padrão 802.11ax) com tecnologia OFDMA e MU-MIMO para alta densidade de dispositivos.",
    symmetry: "Banda simétrica (Velocidade de Upload rigorosamente igual à de Download)."
  },

  plans: [
    {
      name: "Fibra 150MB",
      price: 99.90,
      upload: "150MB",
      wifi: "Dual Band Padrão",
      profile: "Estudos, navegação estável e consumo de vídeo."
    },
    {
      name: "Fibra 300MB",
      price: 119.90,
      upload: "300MB",
      wifi: "Wi-Fi 6 (Alta performance)",
      profile: "Plano mais popular. Ideal para famílias conectadas e streaming 4K."
    },
    {
      name: "Fibra 600MB",
      price: 129.90,
      upload: "600MB",
      wifi: "Wi-Fi 6 Premium",
      profile: "Premium. Máxima performance para Gamers e produtores de conteúdo."
    }
  ] as Plan[],

  benefits: [
    "Instalação Grátis (Equipe técnica qualificada)",
    "Sem taxa de ativação lógica ou física",
    "Instalação rápida (SLA médio de 2 horas)",
    "Segurança digital nativa (filtro de malwares a nível de rede)",
    "Atendimento humanizado hiperlocal (colaboradores nativos da região)"
  ],

  support: {
    phone: "0800 731 1030 (SAC gratuito)",
    whatsapp: "Triagem técnica, financeiro e vendas",
    apps: ["Acesso Net Fibra (Disponível na App Store e Google Play)"],
    availability: "Equipes de campo e NOC operando 24 horas por dia, 7 dias por semana"
  },

  b2b_b2g: {
    solutions: "Links Dedicados com roteamento otimizado para ERPs, VoIP e transações financeiras.",
    clients: "Empresas privadas e Órgãos Públicos (Câmaras Municipais e Prefeituras).",
    differentiation: "NOC local e regularidade fiscal plena (JF Soluções Informática LTDA)."
  }
};
