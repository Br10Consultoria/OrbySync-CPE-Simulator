# OrbySync CPE Simulator

Laboratório isolado para simular CPEs TR-069 no servidor de demonstração do OrbySync. Este projeto não faz parte do repositório principal e não deve ser instalado em servidores de produção.

## Proteções

- inicia desativado por padrão;
- aceita somente o host definido em `ALLOWED_ACS_HOST`;
- não contém credenciais versionadas;
- seriais começam com `SIM`;
- todos os perfis enviam `ProvisioningCode=ORBYSYNC-LAB`;
- usa a rede do host somente no servidor demo, permitindo testar Connection Request;
- limita CPU e memória do container.

## Perfis incluídos

| Perfil | OUI | Modelo | Quantidade padrão |
|---|---:|---|---:|
| ZTE | `0C014B` | F6600P | 5 |
| VSOL | `4C46D1` | V2802DAC | 5 |
| Datacom | `1881ED` | DM986-414Q | 5 |
| Huawei | `485754` | HG8145V5 | 5 |

Os perfis incluem identidade, firmware, uptime, PPPoE, IP de dados, Wi-Fi, hosts associados e sinal óptico sintético.

## Instalação no servidor de demonstração

```bash
git clone git@github.com:Br10Consultoria/OrbySync-CPE-Simulator.git
cd OrbySync-CPE-Simulator
chmod +x simulador.sh
./simulador.sh configurar
nano .env
```

No `.env`:

```dotenv
SIMULATOR_ENABLED=true
ACS_URL=http://demo.orbysync.tec.br:7547
ALLOWED_ACS_HOST=demo.orbysync.tec.br
ACS_USERNAME=preencha_no_servidor
ACS_PASSWORD=preencha_no_servidor
```

Nunca envie o `.env` ao GitHub.

Para cargas maiores, mantenha `SPAWN_INTERVAL_MS` em pelo menos `1500`. Se o
GenieACS informar que a CPE ja esta em sessao, o processo aguarda o timeout do
ACS antes de tentar novamente; `SESSION_RETRY_DELAY_MS` nao deve ser menor que
`35000`.

## Operação

```bash
# Validar Compose e perfis
./simulador.sh validar

# Construir e iniciar
./simulador.sh iniciar

# Acompanhar os Informs
./simulador.sh logs

# Consultar estado
./simulador.sh status

# Parar e remover o container do simulador
./simulador.sh parar
```

Para alterar a quantidade de dispositivos, edite `ZTE_COUNT`, `VSOL_COUNT`, `DATACOM_COUNT` e `HUAWEI_COUNT`. O limite por perfil é 250.

## Identificação e remoção

No OrbySync, pesquise por `SIM` para listar apenas os dispositivos do laboratório. Parar o container interrompe os Informs e os dispositivos ficarão offline; para removê-los definitivamente da base, filtre pelos seriais `SIM...`, selecione todos os resultados e use **Remover**.

## Base técnica

Este projeto executa o [genieacs-sim](https://github.com/genieacs/genieacs-sim), licenciado sob MIT, fixado no commit `be391cab6d586a1e98cd65e57f7cd7ae715be791`. Os perfis e o orquestrador do laboratório são mantidos neste repositório.
