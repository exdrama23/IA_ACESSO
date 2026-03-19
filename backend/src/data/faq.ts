export interface FAQItem {
  category: string;
  questions: string[];
  answer: string;
  keywords: string[];
}

export const faq: Record<string, FAQItem[]> = {
  internet_fibra: [
    {
      category: "Internet Fibra",
      questions: [
        "Quais são os planos de internet fibra?",
        "Quanto custa a internet de fibra?",
        "Qual o valor da internet para casa?",
        "Quais as velocidades de fibra que vocês têm?",
        "Preços da internet fixa"
      ],
      answer: "Temos planos de 50 Mega por 79 e 90, 150 Mega por 99 e 90, 300 Mega por 119 e 90 e 600 Mega por 129 e 90 reais mensais.",
      keywords: ["fibra", "internet", "velocidade", "mega", "preço", "mensalidade"]
    },
    {
      category: "Internet Fibra",
      questions: [
        "Tem plano para professor?",
        "Qual o valor da internet de professor?",
        "Existe desconto para quem é professor?",
        "Plano Fibra Professor"
      ],
      answer: "Sim! Temos o plano Fibra Professor de 200 Mega por um valor exclusivo de 90 reais.",
      keywords: ["professor", "educação", "200 mega", "desconto", "especial"]
    },
    {
      category: "Internet Fibra",
      questions: [
        "O que vem nos planos de fibra?",
        "Tem algum benefício extra na internet?",
        "O que é Skeelo?"
      ],
      answer: "Todos os nossos planos de fibra já incluem o Skeelo para você aproveitar diversos livros digitais.",
      keywords: ["skeelo", "benefício", "livros", "extra", "bônus"]
    }
  ],
  acesso_saude: [
    {
      category: "Acesso Saúde",
      questions: [
        "Como funciona o Acesso Saúde?",
        "Quais são os planos de saúde?",
        "Vocês têm convênio médico?",
        "Valores do Acesso Saúde",
        "Diferença entre os planos de saúde"
      ],
      answer: "A gente oferece planos de Clínica Médica a partir de 29 e 90 e Telemedicina a partir de 19 e 90 reais.",
      keywords: ["saúde", "médico", "clínica", "telemedicina", "consulta", "família"]
    },
    {
      category: "Acesso Saúde",
      questions: [
        "Como é o plano de saúde para família?",
        "Quanto custa a Clínica Médica Família?",
        "Quantas consultas tem o plano família?"
      ],
      answer: "O plano Família custa 59 e 90 e oferece consultas ilimitadas para Clínico Geral e Pediatra, além de 5 consultas de especialidades por mês.",
      keywords: ["família", "especialidades", "ilimitado", "pediatra", "clínico"]
    },
    {
      category: "Acesso Saúde",
      questions: [
        "O que é a Telemedicina da Acesso?",
        "Como funciona a consulta online?",
        "Quanto custa a telemedicina individual?"
      ],
      answer: "A Telemedicina Individual custa 19 e 90 e oferece consultas ilimitadas online com Clínico Geral e Pediatra.",
      keywords: ["telemedicina", "online", "distância", "consulta digital", "barato"]
    }
  ],
  movel_e_fixo: [
    {
      category: "Celular e Telefone",
      questions: [
        "Vocês têm plano de celular?",
        "Quanto custa o chip da Acesso?",
        "O que é o Baratinho 15GB?",
        "Tem plano com WhatsApp ilimitado?",
        "Qual o valor do plano móvel?"
      ],
      answer: "Temos o plano Baratinho 15GB por 39 e 90 mensais. Ele vem com chip, 15GB de internet, ligações e WhatsApp ilimitados.",
      keywords: ["celular", "móvel", "chip", "15gb", "baratinho", "whatsapp", "ligação"]
    },
    {
      category: "Celular e Telefone",
      questions: [
        "Vocês têm telefone fixo?",
        "Qual o valor da telefonia fixa?",
        "Telefone fixo ilimitado"
      ],
      answer: "Sim, temos telefonia fixa com chamadas ilimitadas por 69 e 90 reais por mês.",
      keywords: ["fixo", "telefone", "ligação", "ilimitado"]
    }
  ],
  servicos_adicionais: [
    {
      category: "Serviços Extras",
      questions: [
        "Vocês vendem Globoplay?",
        "Quanto custa o Globoplay na Acesso?",
        "Tem streaming de vídeo?"
      ],
      answer: "Sim, você pode assinar o Globoplay padrão com anúncios por 22 e 90 mensais.",
      keywords: ["globoplay", "streaming", "filmes", "novelas", "vídeo"]
    }
  ],
  institucional: [
    {
      category: "Sobre a Empresa",
      questions: [
        "Quem é a ACESSO.NET?",
        "A Acesso Net é de onde?",
        "Quanto tempo de mercado vocês têm?"
      ],
      answer: "A Acesso Net é um provedor de Sergipe com mais de 23 anos de experiência e sede em Estância.",
      keywords: ["empresa", "quem somos", "história", "estância"]
    }
  ],
  suporte: [
    {
      category: "Suporte",
      questions: [
        "Qual o telefone do suporte?",
        "Como falar com vocês?",
        "WhatsApp da Acesso Net"
      ],
      answer: "Você pode ligar no 0800 731 1030 ou chamar a gente no WhatsApp. Atendemos 24 horas por dia.",
      keywords: ["suporte", "contato", "0800", "whatsapp", "ajuda"]
    }
  ],
  fallback: [
    {
      category: "Erro",
      questions: ["erro_entendimento"],
      answer: "Desculpa, não entendi muito bem. Você pode repetir ou perguntar de outra forma?",
      keywords: ["desculpa", "repetir", "entendi"]
    }
  ],
  tecnologia_e_velocidade: [
    {
      category: "tecnologia_e_velocidade",
      questions: [
        "a internet de vocês é fibra ótica mesmo?",
        "a internet é rápida?",
        "a internet cai muito?",
        "a velocidade de envio é boa?",
        "o que significa velocidade simétrica?",
        "a internet é boa para jogar online?",
        "serve para assistir netflix e youtube sem travar?",
        "qual a diferença da internet de vocês para as outras?",
        "a internet trava quando chove?",
        "internet de vocês presta?",
        "é boa mesmo essa internet?"
      ],
      answer: "Nossa internet é 100% fibra óptica, então não sofre com interferência nem queda na chuva. A velocidade de download e upload é igual, o que deixa tudo mais rápido para jogar, assistir vídeos e usar no dia a dia sem travar.",
      keywords: ["fibra", "otica", "velocidade", "rápida", "cair", "travar", "jogar", "netflix", "upload", "download", "chuva", "simétrica"]
    }
  ],
  suporte_e_atendimento: [
    {
      category: "suporte_e_atendimento",
      questions: [
        "qual o número do suporte?",
        "como faço para falar com um atendente?",
        "vocês têm whatsapp?",
        "qual o horário de funcionamento do suporte?",
        "a internet caiu, para onde eu ligo?",
        "o suporte de vocês é bom?",
        "se der problema no domingo, tem quem conserte?",
        "qual o telefone da acesso.net?",
        "como peço ajuda técnica?",
        "tem suporte agora?",
        "vocês atendem de madrugada?"
      ],
      answer: "Nosso suporte funciona 24 horas por dia, todos os dias da semana. Se precisar, é só ligar gratuitamente para o 0800 731 1030 ou falar com a gente pelo aplicativo.",
      keywords: ["suporte", "atendimento", "telefone", "whatsapp", "ligar", "ajuda", "0800", "problema", "caiu", "horário", "madrugada", "domingo"]
    }
  ],
  aplicativo_e_segunda_via: [
    {
      category: "aplicativo_e_segunda_via",
      questions: [
        "como pego a segunda via do boleto?",
        "onde vejo minha fatura?",
        "vocês têm aplicativo?",
        "como baixo o app da acesso.net?",
        "esqueci de pagar, como pego outro boleto?",
        "tem como pagar por pix?",
        "como eu acesso a central do assinante?",
        "dá para pagar a conta pelo celular?",
        "tem app pra cliente?",
        "posso resolver tudo pelo celular?"
      ],
      answer: "Você pode resolver tudo pelo celular usando o app 'Acesso Net Fibra'. Por lá dá pra pegar segunda via, pagar com PIX e até pedir suporte de forma rápida.",
      keywords: ["boleto", "fatura", "pagar", "segunda via", "2 via", "app", "aplicativo", "pix", "central do assinante", "celular"]
    }
  ],
  historia_e_pioneirismo: [
    {
      category: "historia_e_pioneirismo",
      questions: [
        "quanto tempo a empresa tem?",
        "a acesso.net é nova na cidade?",
        "a empresa é de confiança?",
        "quem é o dono da acesso net?",
        "vocês têm experiência com internet?",
        "a internet de vocês é a melhor de sergipe?",
        "como a empresa começou?",
        "vale a pena contratar vocês?",
        "vocês são confiáveis?"
      ],
      answer: "A gente já tem mais de 20 anos de experiência levando internet para a região. Somos bem avaliados pelos clientes pela velocidade e pelo suporte rápido.",
      keywords: ["história", "tempo", "anos", "pioneira", "confiança", "melhor", "experiência", "23 anos", "sergipe"]
    }
  ],
  localizacao_e_cobertura: [
    {
      category: "localizacao_e_cobertura",
      questions: [
        "onde fica a loja de vocês?",
        "qual o endereço da acesso.net?",
        "vocês atendem em quais cidades?",
        "tem internet na praia do abaís?",
        "vocês cobrem a praia do saco?",
        "tem acesso.net em aracaju?",
        "a empresa é de estância?",
        "vocês atendem litoral?",
        "tem cobertura na minha região?"
      ],
      answer: "Nossa loja fica no centro de Estância, em Sergipe. Também atendemos várias cidades e o litoral, como Abaís, Praia do Saco, Porto do Mato e até Aracaju.",
      keywords: ["endereço", "loja", "onde fica", "cidade", "cobertura", "abaís", "saco", "estância", "aracaju", "porto do mato", "rua"]
    }
  ],
  internet_empresarial: [
    {
      category: "internet_empresarial",
      questions: [
        "vocês têm internet para empresas?",
        "como funciona a internet para cnpj?",
        "o que é link dedicado?",
        "a internet empresarial é diferente?",
        "tem plano corporativo?",
        "minha empresa não pode ficar sem internet, o que vocês oferecem?",
        "atendem lojas e prefeituras?",
        "tem internet mais estável para empresa?"
      ],
      answer: "Sim, temos soluções para empresas com link dedicado. É uma internet exclusiva, mais estável e segura, ideal para negócios que não podem ficar sem conexão.",
      keywords: ["empresa", "cnpj", "link dedicado", "corporativo", "loja", "negócio", "prefeitura", "empresarial", "segurança"]
    }
  ],
  dados_oficiais: [
    {
      category: "dados_oficiais",
      questions: [
        "qual é o cnpj da empresa?",
        "qual a razão social da acesso.net?",
        "a empresa é legalizada?",
        "como a empresa está registrada na receita?",
        "a acesso net é a jf soluções?",
        "qual o nome oficial da empresa?"
      ],
      answer: "Sim, somos uma empresa legalizada. Nosso nome oficial é JF Soluções Informática LTDA e o CNPJ é 07.260.812/0001-15.",
      keywords: ["cnpj", "razão social", "legalizada", "nome", "jf soluções", "documento", "receita", "fantasia"]
    }
  ]
};
