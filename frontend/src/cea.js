import React, { useState, useEffect } from "react";
import { ThemeProvider } from "styled-components";
import ChatBot from "react-simple-chatbot";
import OptionElement from "./OptionElement";
import moment from "moment";
import crypto from "crypto";

import {
  getOrder,
  getOrderById,
  createDialog,
  setDialog,
  getUTCDate,
} from "./services/Integrations";
import { getIntent } from "./services/NLPIntegrations";
import genStartToken from "./utils/genStartToken";
import apiServices from "./services/ApiService";

import logo from "./assets/logo.png";
import avatar from "./assets/avatar.png";
import loadingImg from "./assets/simple_loading.gif";
import ChatbotButton from "./ChatbotButton";
import "./App.css";

function captitalize(text) {
  if (text === "") return text;
  else return text.charAt(0).toUpperCase() + text.slice(1);
}

function valida_cpf(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.toString().length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  var result = true;
  [9, 10].forEach(function (j) {
    var soma = 0,
      r;
    cpf
      .split(/(?=)/)
      .splice(0, j)
      .forEach(function (e, i) {
        soma += parseInt(e) * (j + 2 - (i + 1));
      });
    r = soma % 11;
    r = r < 2 ? 0 : 11 - r;
    if (r != cpf.substring(j, j + 1)) result = false;
  });
  return result;
}

function valida_pedido(pedido) {
  return /((v|V)\d{8}(cea-|CEA-)\d{2})$/.test(pedido);
}

function valida_email(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

async function valida_horario(horario) {
  const time = await getUTCDate();
  return time;
}

const otherFontTheme = {
  background: "#ffffff",
  fontFamily: "Greycliff CF",
  headerBgColor: "#eceff5",
  headerFontColor: "#212b36",
  headerFontSize: "12px",
  botBubbleColor: "#f3f3f3",
  botFontColor: "#28323d",
  userBubbleColor: "#e5f2ff",
  userFontColor: "#28323d",
  bubbleOptionStyle: {
    optionBubbleColor: "#212B36",
    optionFontColor: "#ffff",
  },
};

function ListOrderCpf(props) {
  const name = props.steps.name;

  const cleanCpf = sessionStorage.getItem("cleanCpf") === "true" ? true : false;
  const cpf = cleanCpf ? null : props.steps.cpf;

  let cpfStr = cpf
    ? cpf.value.replace(/\./gi, "").replace("-", "")
    : sessionStorage.getItem("cpf");

  sessionStorage.setItem("cpf", cpfStr);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      console.log(cpf);

      const resultOrder = cpf ? await getOrder(cpfStr) : { list: [] };
      console.log(resultOrder);
      setOrders(resultOrder.list.slice(0, 5));

      if (!resultOrder.list.length) {
        sessionStorage.setItem("cpf", null);
        sessionStorage.setItem("cleanCpf", true);
      } else {
        sessionStorage.setItem("miss_cpf_count", 0);

        sessionStorage.setItem("cleanCpf", false);
      }
      sessionStorage.setItem(
        "orders",
        JSON.stringify(resultOrder.list.slice(0, 5))
      );
      const current_value = parseInt(sessionStorage.getItem("miss_cpf_count"));
      sessionStorage.setItem("miss_cpf_count", current_value + 1);
      if (current_value < 2) {
        setRetry(true);
        sessionStorage.setItem("cpf_retry", true);
      } else {
        sessionStorage.setItem("miss_cpf_count", 0); // go to atendente
        setRetry(false);
        sessionStorage.setItem("cpf_retry", false);
        props.triggerNextStep({ trigger: "TransferirEspecialista" }); // go to retry
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {orders.length > 0 && (
            <p>
              {captitalize(name.value)}, localizei os pedidos abaixo, qual deles
              você quer informações?
            </p>
          )}
          {!orders.length > 0 && retry && (
            <p>
              Este CPF eu não encontrei.{""} Podemos tentar novamente?{""}{" "}
              Escolha uma das opções:
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ListOrderPedido(props) {
  const pedido = props.steps.pedido.value;
  localStorage.setItem("order", pedido);

  // const cpfStr = cpf.value.replace(/\./gi, '').replace('-', '')
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const resultOrder = await getOrderById(pedido);
      if (!resultOrder.error) {
        setOrders(resultOrder);
        sessionStorage.setItem("orders", JSON.stringify(resultOrder));
        setLoading(false);
      } else {
        sessionStorage.setItem("orders", null);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {orders && <p>O que deseja saber sobre o pedido {pedido}?</p>}
          {!orders && (
            <p>
              Este número do pedido eu não encontrei. Podemos tentar novamente?
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TransferirEspecialista(props) {
  const name = props.steps.name;

  return (
    <div>
      <p>
        {captitalize(name.value)}, este CPF informado eu não localizei. Posso
        transferir para um dos nossos especialista?
      </p>
    </div>
  );
}

function ListOrderByCpfCancel(props) {
  const name = props.steps.name;
  const cpf = props.steps.cpf2 || props.steps.cpf;
  let cpfStr = cpf
    ? cpf.value.replace(/\./gi, "").replace("-", "")
    : sessionStorage.getItem("cpf");

  sessionStorage.setItem("cpf", cpfStr);
  sessionStorage.setItem("storeCpf", true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const resultOrder = await getOrder(cpfStr);
      setOrders(resultOrder.list.slice(0, 5));
      sessionStorage.setItem(
        "orders",
        JSON.stringify(resultOrder.list.slice(0, 5))
      );
      const current_value = parseInt(sessionStorage.getItem("miss_cpf_count"));
      sessionStorage.setItem("miss_cpf_count", current_value + 1);
      if (current_value < 2) {
        setRetry(true);
        sessionStorage.setItem("cpf_retry", true);
      } else {
        sessionStorage.setItem("miss_cpf_count", 0); // go to atendente
        setRetry(false);
        sessionStorage.setItem("cpf_retry", false);
        props.triggerNextStep({ trigger: "TransferirEspecialista" }); // go to retry
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {orders.length > 0 && (
            <p>
              {captitalize(name.value)}, localizei os pedidos abaixo, qual deles
              você quer informações?
            </p>
          )}
          {!orders.length > 0 && retry && (
            <p>Este CPF eu não encontrei. Podemos tentar novamente?</p>
          )}
        </div>
      )}
    </div>
  );
}

function ListOrderByIdCancel(props) {
  const name = props.steps.name;
  const pedido = props.steps.pedido2.message;
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const resultOrder = await getOrderById(pedido);
      setOrders(resultOrder);
      sessionStorage.setItem("orders", JSON.stringify(resultOrder));
    }
    fetchData();
  }, []);

  return (
    <div>
      {orders && (
        <p>
          {captitalize(name.value)}, localizei o pedido abaixo, você deseja
          cancelar?
        </p>
      )}
      {!orders && (
        <p>Este número de pedido eu não encontrei. Podemos tentar novamente?</p>
      )}
    </div>
  );
}

function ListOptions(props) {
  const [options, setOptions] = useState(null);
  useEffect(async () => {
    let order = sessionStorage.getItem("orders");
    order = order === "null" ? null : order;
    if (order) {
      setOptions("normal");
    } else {
      setOptions("noOrder");
    }
  }, []);

  return (
    <div>
      {options === "normal" && (
        <>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "1313" });
            }}
          >
            Status do Pedido
          </OptionElement>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "12" });
            }}
          >
            Código do Boleto
          </OptionElement>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "13" });
            }}
          >
            Nota Fiscal
          </OptionElement>
        </>
      )}
      {options === "noOrder" && (
        <>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "7pedido" });
            }}
          >
            Tentar novamente
          </OptionElement>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "7" });
            }}
          >
            Voltar ao menu anterior
          </OptionElement>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "5" });
            }}
          >
            Voltar ao menu inicial
          </OptionElement>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "sair" });
            }}
          >
            Sair
          </OptionElement>
        </>
      )}
    </div>
  );
}

function Status(props) {
  const orderId = localStorage.getItem("order");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shippingDate, setShippingDate] = useState(null);
  const [isDelivered, setIsDelivered] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [paymentType, setPaymentType] = useState(null);
  const [trackCode, setTrackCode] = useState(null);
  const [trackUrl, setTrackUrl] = useState(null);
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const resultOrder = await getOrderById(orderId);
      const {
        statusDescription,
        ShippingEstimatedDateMax,
        shippingData,
        paymentNames,
      } = resultOrder;
      const packages = resultOrder.packageAttachment.packages;
      if (Array.isArray(packages) && packages.length > 0) {
        const trackingNumber = packages[0].trackingNumber;
        const trackingUrl = packages[0].trackingUrl;
        const delivery = packages[0].courierStatus;
        try {
          if (delivery.data.length > 0) {
            if (delivery.data[0].description === "Pedido entregue") {
              setIsDelivered(true);
            }
          }
        } catch { }
        setTrackCode(trackingNumber);
        setTrackUrl(trackingUrl);
      }
      if (shippingData.logisticsInfo[0].shippingEstimateDate) {
        let date = moment(
          shippingData.logisticsInfo[0].shippingEstimateDate
        ).format("DD/MM/YYYY");
        setShippingDate(date);
      }
      setStatus(statusDescription);
      // setIsDelivered(isAnyDelivered);
      // setDeliveryDate(deliveryDates);
      setPaymentType(paymentNames);

      sessionStorage.setItem("status", JSON.stringify(statusDescription));
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {(status === "Cancelado" ||
            status === "Cancelar" ||
            status === "Substituído") && (
              <p>
                Verifiquei que o seu pedido <b>nº {orderId}</b>está com o status:{" "}
                <b>Cancelado</b>. Caso não tenha solicitado o cancelamento, fale
                com um dos nossos especialistas. Você também pode visualizar o
                status do seu pedido, acessando o nosso{" "}
                <a
                  href="https://www.cea.com.br/minha-conta"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  site
                </a>{" "}
                ou pelo{" "}
                <a
                  href="https://play.google.com/store/apps/details?id=br.com.cea.appb2c&hl=pt_BR"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  APP
                </a>
                .
              </p>
            )}

          {(status === "Pagamento Aprovado" ||
            status === "Preparando entrega" ||
            status === "Autorizar Despacho" ||
            status === "Carência Cancelamento" ||
            status === "Pronto para Manuseio" ||
            status === "Iniciar Manuseio") && (
              <p>
                Verifiquei que o seu pedido nº <b>{orderId}</b> está com status:{" "}
                <b>Pagamento Aprovado</b>.<br />
                Previsão da data de entrega: <b>{shippingDate}</b>.<br />
              </p>
            )}
          {(status === "Pagamento Aprovado" ||
            status === "Preparando entrega" ||
            status === "Autorizar Despacho" ||
            status === "Carência Cancelamento" ||
            status === "Pronto para Manuseio" ||
            status === "Iniciar Manuseio") &&
            trackCode && (
              <p>
                Seu código de rastreio é <b>{trackCode}</b>{" "}
              </p>
            )}
          {(status === "Faturado" ||
            status === "Pagamento Aprovado" ||
            status === "Preparando entrega") &&
            !isDelivered &&
            trackUrl && (
              <p>
                {" "}
                <a href={trackUrl} target="_blank" rel="noopener noreferrer">
                  Clique aqui
                </a>{" "}
                para acessar o site de rastreio.
              </p>
            )}
          {/* Data prometida de entrega (xxxxxxx) */}

          {(status === "Pagamento Aprovado" ||
            status === "Preparando entrega" ||
            status === "Autorizar Despacho" ||
            status === "Carência Cancelamento" ||
            status === "Pronto para Manuseio" ||
            status === "Iniciar Manuseio") &&
            !trackCode && (
              <p>
                Seu pedido não contém o código de rastreio.
                <br />
              </p>
            )}

          {(status === "Entregue" ||
            status === "Retirado pelo Cliente" ||
            status === "Entrega ao Cliente" ||
            status === "Objeto Entregue" ||
            isDelivered) && (
              <p>
                Verifiquei que o seu pedido nº <b>{orderId}</b> está com o status:{" "}
                <b>Entregue</b>.
                <br />
                Você também pode visualizar o status do seu pedido, acessando o
                nosso{" "}
                <a
                  href="https://www.cea.com.br/login?returnUrl=https://www.cea.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  site
                </a>{" "}
                ou pelo APP C&A disponível no{" "}
                <a
                  href="https://apps.apple.com/br/app/c-a-loja-online-moda-roupas/id1168148250"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IOS
                </a>{" "}
                ou{" "}
                <a
                  href="https://play.google.com/store/apps/details?id=br.com.cea.appb2c&hl=pt_BR"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Android
                </a>
                .
              </p>
            )}

          {(status === "Pagamento Pendente" ||
            status === "Aguardando autorização para despachar" ||
            status === "Pagamento Negado") && (
              <p>
                Verifiquei que o seu pedido nº <b>{orderId}</b> está com status:{" "}
                <b>Aguardando aprovação</b>.<br />
                Se você realizou o pagamento via Boleto Bancário, aguarde o prazo
                de 72 horas úteis para confirmação do pagamento.
                <br />O prazo de entrega será informado após a aprovação do
                pagamento.
              </p>
            )}

          {status === "Falha na entrega" && (
            <p>
              Identificamos que houve uma divergência no processo de entrega do
              seu pedido.
              <br />
              Não se preocupe, vou te transferir para um dos nossos
              especialistas.
            </p>
          )}

          {(status === "Em andamento" ||
            status === "Faturado" ||
            status === "invoice" ||
            status === "Autorizar despacho" ||
            status === "Transporte para loja" ||
            status === "Entregue Loja Errada" ||
            status === "Verificando envio" ||
            status === "Enviando") &&
            !isDelivered && (
              <p>
                Verifiquei que o seu pedido nº <b>{orderId}</b> está com status:{" "}
                <b>Em andamento</b>.<br />
                Previsão da data de entrega: <b>{shippingDate}</b>
                <br />
                Seu pedido não contém o código de rastreio
                <br />
              </p>
            )}

          {(status === "Dísponivel na loja" ||
            status === "Recebido na Loja") && (
              <p>
                Verifiquei que o seu pedido nº <b>{orderId}</b> está com status:{" "}
                <b>Disponível para retirada em nossa loja</b>.{" "}
              </p>
            )}
        </div>
      )}
    </div>
  );
}

function Boleto(props) {
  const orderId = localStorage.getItem("order");
  const [paymentType, setPaymentType] = useState(null);
  const [boleto, setBoleto] = useState(null);
  const [barCode, setBarCode] = useState(null);
  const [statusDescription, setStatus] = useState(null);

  useEffect(async () => {
    const resultOrder = await getOrderById(orderId);
    const { statusDescription } = resultOrder;
    const {
      paymentSystemName,
      bankIssuedInvoiceIdentificationNumberFormatted,
      url,
    } = resultOrder.paymentData.transactions[0].payments[0];
    setStatus(statusDescription);
    setBoleto(url);
    setPaymentType(paymentSystemName);
    setBarCode(bankIssuedInvoiceIdentificationNumberFormatted);
  }, []);

  return (
    <div>
      {statusDescription === "Cancelado" && (
        <p>
          Verifiquei que o seu pedido <b>{orderId}</b> está com o status:
          <b>Cancelado</b>. Código de Boleto indisponível.
        </p>
      )}
      {statusDescription !== "Cancelado" && paymentType !== "Boleto Bancário" && (
        <p>
          Pedido <b>{orderId}</b> não contém a forma de pagamento boleto
          bancário.
        </p>
      )}
      {statusDescription !== "Cancelado" &&
        boleto &&
        paymentType === "Boleto Bancário" && (
          <p style={{ flex: 1, flexWrap: "wrap" }}>
            O Pedido <b>{orderId}</b> gerou o código de barras:
            <br />
            {barCode} <br />
            <a href={boleto} target="_blank" rel="noopener noreferrer">
              Clique aqui
            </a>{" "}
            se preferir baixar o boleto para pagamento.
          </p>
        )}
    </div>
  );
}

function NotaFiscal(props) {
  const orderId = localStorage.getItem("order");
  const [loading, setLoading] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState(null);

  useEffect(async () => {
    setLoading(true);
    const resultOrder = await getOrderById(orderId);
    if (resultOrder.packageAttachment.packages.length) {
      const notaFiscalUrl =
        resultOrder.packageAttachment.packages[0].invoiceUrl;
      setNotaFiscal(notaFiscalUrl);
      sessionStorage.setItem("notaFiscalUrl", JSON.stringify(notaFiscalUrl));
    }
    setLoading(false);
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {notaFiscal && (
            <p>
              <a href={notaFiscal} target="_blank" rel="noopener noreferrer">
                {" "}
                Clique aqui
              </a>{" "}
              para acessar a nota fiscal do seu pedido.
            </p>
          )}
          {!notaFiscal && (
            <p>Não localizamos a nota fiscal para esse pedido.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusCancel(props) {
  const orderId = localStorage.getItem("orderCancel");
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(async () => {
    setLoading(true);

    const resultOrder = await getOrderById(orderId);
    const { paymentData } = resultOrder;
    if (paymentData.transactions.length) {
      const type = paymentData.transactions[0].payments[0].group;
      if (type === "creditCard") setIsCreditCard(true);
    }
    setLoading(false);
  }, []);

  return (
    <div>
      {" "}
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {isCreditCard && (
            <p>
              {" "}
              Você pode realizar o cancelamento do seu pedido <b>{orderId}</b>,
              pelo nosso site{" "}
              <a
                href="https://www.cea.com.br/login?returnUrl=https://www.cea.com.br/"
                target="_blank"
                rel="noopener noreferrer"
              >
                clicando aqui
              </a>
              , basta entrar na sua conta localizar seu pedido e solicitar o
              cancelamento ou se preferir fale com um dos nossos especialistas.
            </p>
          )}
          {!isCreditCard && (
            <p>
              {" "}
              Para realizar a solicitação de cancelamento do seu pedido{" "}
              <b>{orderId}</b>, você precisa falar com um dos nossos
              especialistas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StepButton(props) {
  const cpf = props.steps.cpf;
  let cpfStr = cpf
    ? cpf.value.replace(/\./gi, "").replace("-", "")
    : sessionStorage.getItem("cpf");
  const [stepOrders, setStepOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState();

  useEffect(async () => {
    let retry_storage =
      sessionStorage.getItem("cpf_retry") === "true" ? true : false;

    setLoading(true);
    const resultOrder = await getOrder(cpfStr);
    setStepOrders(resultOrder.list.slice(0, 5));
    setLoading(false);
    setRetry(retry_storage);
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <div>
          {stepOrders.length > 0 &&
            stepOrders.map((step) => (
              <>
                <OptionElement
                  className="sc-hKFxyN cAAIVE rsc-os-option-element"
                  onClick={() => {
                    props.triggerNextStep({ trigger: "10" });
                    localStorage.setItem("order", step.orderId);
                  }}
                >
                  {step.orderId}
                </OptionElement>
              </>
            ))}

          {stepOrders.length === 0 && retry && (
            <>
              <OptionElement
                className="sc-hKFxyN cAAIVE rsc-os-option-element"
                onClick={() => {
                  props.triggerNextStep({ trigger: "7" });
                }}
              >
                Tentar Novamente
              </OptionElement>
              <OptionElement
                className="sc-hKFxyN cAAIVE rsc-os-option-element"
                onClick={() => {
                  props.triggerNextStep({ trigger: "6" });
                }}
              >
                Voltar ao menu
              </OptionElement>
              <OptionElement
                className="sc-hKFxyN cAAIVE rsc-os-option-element"
                onClick={() => {
                  props.triggerNextStep({ trigger: "sair" });
                }}
              >
                Sair
              </OptionElement>
            </>
          )}
          {/* {stepOrders.length === 0 && !retry && <></>} */}
        </div>
      )}
    </div>
  );
}

function RetryCPF(props) {
  useEffect(async () => {
    const current_value =
      parseInt(sessionStorage.getItem("miss_cpf_count")) || 0;
    sessionStorage.setItem("miss_cpf_count", current_value + 1);

    if (current_value < 3) {
      props.triggerNextStep({ trigger: "nlp_0" }); // go to retry
    } else {
      sessionStorage.setItem("miss_cpf_count", 1); // go to atendente
      props.triggerNextStep({ trigger: "nlp_3" });
    }
  }, []);
  return null;
}

function StepButtonOrder(props) {
  const pedido = props.steps.pedido.message;
  // localStorage.setItem("order", pedido);
  // const cpfStr = cpf.value.replace(/\./gi, '').replace('-', '')
  const [stepOrders, setStepOrders] = useState([]);

  useEffect(async () => {
    const resultOrder = await getOrderById(pedido);
    setStepOrders(resultOrder);
  }, []);

  return (
    <>
      <div>
        {stepOrders && (
          <>
            <OptionElement
              className="sc-hKFxyN cAAIVE rsc-os-option-element"
              onClick={() => {
                props.triggerNextStep({ trigger: "10" });
                localStorage.setItem("order", stepOrders.orderId);
              }}
            >
              {stepOrders.orderId}
            </OptionElement>
          </>
        )}

        {!stepOrders && (
          <>
            <OptionElement
              className="sc-hKFxyN cAAIVE rsc-os-option-element"
              onClick={() => {
                props.triggerNextStep({ trigger: "7" });
              }}
            >
              Tentar Novamente
            </OptionElement>
            <OptionElement
              className="sc-hKFxyN cAAIVE rsc-os-option-element"
              onClick={() => {
                props.triggerNextStep({ trigger: "6" });
              }}
            >
              Voltar ao menu
            </OptionElement>
            <OptionElement
              className="sc-hKFxyN cAAIVE rsc-os-option-element"
              onClick={() => {
                props.triggerNextStep({ trigger: "sair" });
              }}
            >
              Sair
            </OptionElement>
          </>
        )}
      </div>
    </>
  );
}

function StepButtonCancel(props) {
  const cpf = props.steps.cpf2 || props.steps.cpf;
  const cpfStr = cpf.value.replace(/\./gi, "").replace("-", "");
  const [stepOrders, setStepOrders] = useState([]);

  useEffect(async () => {
    const resultOrder = await getOrder(cpfStr);
    setStepOrders(resultOrder.list.slice(0, 5));
  }, []);

  return (
    <>
      <div>
        {stepOrders.map((step) => (
          <>
            <OptionElement
              className="sc-hKFxyN cAAIVE rsc-os-option-element"
              onClick={() => {
                props.triggerNextStep({ trigger: "100099" });
                localStorage.setItem("orderCancel", step.orderId);
              }}
            >
              {step.orderId}
            </OptionElement>
          </>
        ))}
      </div>
    </>
  );
}

function StepButtonCancelPedido(props) {
  const pedido = props.steps.pedido2.message;
  const [stepOrders, setStepOrders] = useState([]);

  useEffect(async () => {
    const resultOrder = await getOrderById(pedido);
    setStepOrders(resultOrder);
  }, []);

  return (
    <>
      <div>
        <>
          <OptionElement
            className="sc-hKFxyN cAAIVE rsc-os-option-element"
            onClick={() => {
              props.triggerNextStep({ trigger: "100099" });
              localStorage.setItem("orderCancel", stepOrders.orderId);
            }}
          >
            {stepOrders.orderId}
          </OptionElement>
        </>
      </div>
    </>
  );
}

function ReadIntent(props) {
  const text = props.steps.readIntentIntermed.message;
  const [loading, setLoading] = useState(false);

  useEffect(async () => {
    setLoading(true);
    const intent = await getIntent(text);
    if (
      intent.data.action.toString() === "-1" ||
      intent.data.action.toString() === "-2"
    ) {
      props.triggerNextStep({ trigger: "notUnderstand" });
    } else if (intent.data.action.toString() === "-3") {
      props.triggerNextStep({ trigger: "notHarassment" });
    } else {
      props.triggerNextStep({ trigger: intent.data.action.toString() });
    }
    setLoading(false);
  }, []);

  return (
    <div>
      {loading ? (
        <img src={loadingImg} className="img-loading" alt="loading"></img>
      ) : (
        <></>
      )}
    </div>
  );
}

function ShowOptions(props) {
  return (
    <div>
      <>
        <OptionElement
          className="sc-hKFxyN cAAIVE rsc-os-option-element"
          onClick={() => {
            props.triggerNextStep({ trigger: "7" });
          }}
        >
          Informações de Pedidos
        </OptionElement>
        <OptionElement
          className="sc-hKFxyN cAAIVE rsc-os-option-element"
          onClick={() => {
            props.triggerNextStep({ trigger: "20" });
          }}
        >
          Outros assuntos de SAC
        </OptionElement>
      </>
    </div>
  );
}

function CheckCPF(props) {
  if (!sessionStorage.getItem("storeCpf") === "true")
    sessionStorage.setItem("cpf", null);
  let action;
  const [message, setMessage] = useState(null);
  useEffect(async () => {
    let cpf = sessionStorage.getItem("cpf");
    cpf = cpf === "null" ? null : cpf;
    if (cpf) {
      // sessionStorage.setItem("cleanCpf", null);
      action = "listorderCpf";
      setMessage(
        <div>
          <p>Certo!</p>
        </div>
      );
    } else {
      action = "cpf";
      sessionStorage.setItem("cleanCpf", null);
      setMessage(
        <div>
          <p>
            Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:
          </p>
        </div>
      );
    }

    props.triggerNextStep({ trigger: action });
  }, []);

  // return <div><p>Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:</p></div>;
  return message;
}

function CheckCPFCancel(props) {
  // sessionStorage.setItem("cpf", null);
  let action;
  const [message, setMessage] = useState(null);
  useEffect(async () => {
    let cpf = sessionStorage.getItem("cpf");
    cpf = cpf === "null" ? null : cpf;
    if (cpf) {
      action = "899";
      setMessage(
        <div>
          <p>Certo!</p>
        </div>
      );
    } else {
      action = "cpf2";
      setMessage(
        <div>
          <p>
            Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:
          </p>
        </div>
      );
    }

    props.triggerNextStep({ trigger: action });
  }, []);

  // return <div><p>Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:</p></div>;
  return message;
}

function CheckHorario(props) {
  let action;
  const [message, setMessage] = useState(null);
  useEffect(async () => {
    let horario = await valida_horario();
    // dom = 0, seg =1, ter =2, qua =3, qui = 4, sex = 5, sab= 6,
    horario = horario.date_now.replace("Z", "");

    horario = moment(horario).format("YYYY-MM-DDTHH:mm:ss");
    let date_now = moment(horario);
    let dayOfWeek = date_now.day();
    let hour = date_now.hours() - 3;

    // let minute = date_now.minutes();
    //dia de semana
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      if (hour < 9 || hour > 21) {
        action = "handlerMenu";
        setMessage(
          "Nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
        );
      } else {
        action = "10012";
        setMessage(
          "Entendi! Neste caso vou transferir para um dos nossos especialistas."
        );
      }
    } else if (dayOfWeek == 6) {
      if (hour < 10 || hour > 16) {
        action = "handlerMenu";
        setMessage(
          "Nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
        );
      } else {
        action = "10012";
        setMessage(
          "Entendi! Neste caso vou transferir para um dos nossos especialistas."
        );
      }
    } else {
      action = "handlerMenu";
      setMessage(
        "Nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
      );
    }

    props.triggerNextStep({ trigger: action });
  }, []);

  return (
    <div>
      <p>{message}</p>
    </div>
  );
  // return message;
}

function CheckHorarioPromo(props) {
  let action;
  const [message, setMessage] = useState(null);
  useEffect(async () => {
    let horario = await valida_horario();
    // dom = 0, seg =1, ter =2, qua =3, qui = 4, sex = 5, sab= 6,
    horario = horario.date_now.replace("Z", "");

    horario = moment(horario).format("YYYY-MM-DDTHH:mm:ss");
    let date_now = moment(horario);
    let dayOfWeek = date_now.day();
    let hour = date_now.hours() - 3;

    // let minute = date_now.minutes();
    //dia de semana
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      if (hour < 9 || hour > 21) {
        action = "handlerMenu";
        setMessage(
          "Neste caso você precisa falar com um dos nossos especialista, mas nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
        );
      } else {
        action = "10012";
        setMessage(
          "Entendi! Neste caso vou transferir para um dos nossos especialistas."
        );
      }
    } else if (dayOfWeek == 6) {
      if (hour < 10 || hour > 16) {
        action = "handlerMenu";
        setMessage(
          "Neste caso você precisa falar com um dos nossos especialista, mas nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
        );
      } else {
        action = "10012";
        setMessage(
          "Entendi! Neste caso vou transferir para um dos nossos especialistas."
        );
      }
    } else {
      action = "handlerMenu";
      setMessage(
        "Neste caso você precisa falar com um dos nossos especialista, mas nosso atendimento funciona de segunda a sexta, das 9h às 21h e aos sábados, das 10h às 16h."
      );
    }

    props.triggerNextStep({ trigger: action });
  }, []);

  return (
    <div>
      <p>{message}</p>
    </div>
  );
  // return message;
}

function addZendeskScript(url) {
  let script = document.createElement("script");
  script.src = process.env.ZENDESK_WIDGET_URL;
  script.id = "ze-snippet";
  document.body.appendChild(script);
}

function ChatZendesk(props) {
  useEffect(() => {
    const name = props.steps.name.value;
    const email = props.steps.email.value;
    const steps = Object.values(props.steps);
    let values = steps
      .map((item) => item.message)
      .filter((item) => item !== undefined);

    if (window.zE === undefined) {
      addZendeskScript();
    }

    const timer = setTimeout(() => {
      const msg = `Nome: ${name} \n E-mail: ${email}; Fluxo: ${values}`;
      window.zE("webWidget", "open");
      window.zE("webWidget", "chat:send", msg);
      props.unmountChat();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

function RetryButton(props) {
  useEffect(async () => {
    const current_value = parseInt(sessionStorage.getItem("miss_count")) || 1;
    sessionStorage.setItem("miss_count", current_value + 1);

    if (current_value < 2) {
      props.triggerNextStep({ trigger: "nlp_0" });
    } else {
      sessionStorage.setItem("miss_count", 1);
      props.triggerNextStep({ trigger: "nlp_3" });
    }
  }, []);
  return null;
}

function HandlerMenu(props) {
  let action;

  useEffect(async () => {
    let cpf = sessionStorage.getItem("cpf");
    cpf = cpf === "null" ? null : cpf;

    if (cpf) {
      action = "menuAjudaInfoPedidosStatusComCpf";
    } else {
      action = "menuAjudaInfoPedidos";
    }

    props.triggerNextStep({ trigger: action });
  }, []);

  // return <div><p>Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:</p></div>;
  return (
    <div>
      <p>O que deseja fazer agora?</p>
    </div>
  );
}

function Finish(props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      props.unmountChat();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div>
      <p>Obrigado por avaliar.</p>
    </div>
  );
}

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    localStorage.setItem("rsc_cache", "");
    sessionStorage.setItem("cpf", null);
    sessionStorage.setItem("cleanCpf", false);
    sessionStorage.setItem("cpf_retry", false);

    fetchData();
    let current_date = new Date().valueOf().toString();
    let random = Math.random().toString();
    let idToken = crypto
      .createHash("sha1")
      .update(current_date + random)
      .digest("hex");

    window.openChatbot = () => setIsChatOpen(true);

    async function fetchData() {
      const resultGenStartToken = await genStartToken();
      const resultToken = await apiServices.post("/access/newtoken", {
        startToken: resultGenStartToken,
      });
      localStorage.setItem("accessToken", resultToken.data.accessToken);
    }

    createDialog(idToken);
    // const intervalId = setInterval(() => {
    //   setDialog(idToken, localStorage.getItem("rsc_cache"));
    //   //assign interval to a variable to clear it.
    // }, 5000);

    // return () => clearInterval(intervalId);
  }, []);

  sessionStorage.setItem("miss_cpf_count", 0);
  sessionStorage.setItem("cpf_retry", true);

  return (
    <div className="App">
      {showChat &&
        (
          <ThemeProvider theme={otherFontTheme}>
            <ChatBot
              userDelay="1000"
              botDelay="1000"
              placeholder={"Digite aqui"}
              headerTitle={"Chat on-line"}
              botAvatar={logo}
              userAvatar={avatar}
              floating={true}
              floatingIcon={<ChatbotButton />}
              opened={isChatOpen}
              toggleFloating={() => setIsChatOpen(!isChatOpen)}
              steps={[
                {
                  id: "1",
                  message: "Olá, eu sou a assistente virtual da C&A!",
                  trigger: "2",
                },
                {
                  id: "2",
                  message: "Me fala seu nome, para podermos conversar!",
                  trigger: "name",
                },
                {
                  id: "name",
                  user: true,
                  validator: (value) => {
                    if (/^[A-Za-z]+$/.test(value)) {
                      return true;
                    } else {
                      return "Por favor, insira seu primeiro nome";
                    }
                  },
                  trigger: "4",
                },
                {
                  id: "4",
                  message: `Tudo bem, {previousValue}! Por favor, agora me informe seu e-mail.`,
                  trigger: "email",
                },
                {
                  id: "email",
                  user: true,
                  validator: (value) => {
                    const email_is_valid = valida_email(value);
                    if (email_is_valid) {
                      return true;
                    } else {
                      return "Insira um e-mail válido.";
                    }
                  },
                  trigger: "4e5",
                },

                {
                  id: "4e5",
                  message: `Obrigada! Tenho informações sobre Pedidos ou Outros Assuntos relacionados ao SAC.`,
                  trigger: "5",
                },
                {
                  id: "5",
                  message: "Como posso ajudar?",
                  trigger: "readIntent",
                },
                {
                  id: "readIntent",
                  component: <ShowOptions />,
                  // asMessage: true,
                  // user: true,
                  trigger: "readIntentIntermed",
                },
                {
                  id: "readIntentIntermed",
                  // asMessage: true,
                  user: true,
                  trigger: "readIntent2",
                },

                {
                  id: "readIntent2",
                  component: <ReadIntent />,
                  // asMessage: true,
                  // user: true,
                  // trigger: '6'
                },
                {
                  id: "6",
                  options: [
                    { value: 1, label: "Informações de Pedidos", trigger: "7" },
                    {
                      value: 2,
                      label: "Outros assuntos de SAC",
                      trigger: "20",
                    },
                  ],

                  // user:true,
                },

                {
                  id: "7",
                  message:
                    "Para continuar, escolha se deseja fazer a consulta por CPF ou número do pedido:",
                  trigger: "7options",
                },
                {
                  id: "7options",
                  options: [
                    { value: 1, label: "CPF", trigger: "7cpf" },
                    { value: 2, label: "Número do pedido", trigger: "7pedido" },
                  ],
                  hideInput: true,
                },
                {
                  id: "7cpf",
                  component: <CheckCPF />,
                  asMessage: true,
                  // message:
                  //   "Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:",
                  // trigger: "cpf",
                  hideInput: true,
                },
                {
                  id: "7pedido",
                  message:
                    "Certo! Para que eu possa localizar seu cadastro, me informe seu número do pedido:",
                  trigger: "pedido",
                },
                {
                  id: "cpf",
                  validator: (value) => {
                    // if (/([0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[-]?[0-9]{2})|([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/.test(value)) {
                    const cpf_is_valid = valida_cpf(value);
                    if (cpf_is_valid) {
                      return true;
                    } else {
                      return "Insira um CPF válido.";
                    }
                  },
                  user: true,
                  trigger: "listorderCpf",
                },
                {
                  id: "pedido",
                  validator: (value) => {
                    // if (/((v)[0-9]{1,8}(cea-)\d{2})/.test(value)) {
                    const pedido_is_valid = valida_pedido(value);
                    if (pedido_is_valid) {
                      return true;
                    } else {
                      return "Insira um n° de pedido válido.";
                    }
                  },
                  user: true,
                  trigger: "listorderPedido",
                },
                {
                  id: "listorderCpf",
                  component: <ListOrderCpf />,
                  asMessage: true,
                  trigger: "9",
                },
                {
                  id: "listorderPedido",
                  component: <ListOrderPedido />,
                  asMessage: true,
                  trigger: "11",
                },
                {
                  id: "9",
                  component: <StepButton />,
                  waitAction: true,
                },
                {
                  id: "9pedido",
                  component: <StepButtonOrder />,
                  waitAction: true,
                },
                {
                  id: "10",
                  message: "O que deseja saber sobre o pedido {previousValue}?",
                  trigger: "11",
                },
                {
                  id: "11",
                  component: <ListOptions />,
                },
                {
                  id: "1313",
                  component: <Status />,
                  asMessage: true,
                  trigger: "handlerMenu",
                  // trigger: 'menuAjudaInfoPedidos'
                },
                // {
                //   id: "handlerMenuIntermed",
                //   message: "O que deseja fazer agora?",
                //   trigger: "handlerMenu",
                // },
                {
                  id: "handlerMenu",
                  component: <HandlerMenu />,
                  asMessage: true,
                  // trigger: "handlerMenu",
                  // trigger: 'menuAjudaInfoPedidos'
                },

                {
                  id: "15",
                  component: (
                    <div>
                      <p>
                        Clique{" "}
                        <a href="#" target="_blank" rel="noopener noreferrer">
                          aqui
                        </a>{" "}
                        se preferir baixar o boleto para pagamento
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  end: true,
                },
                {
                  id: "12",
                  component: <Boleto />,
                  asMessage: true,
                  trigger: "handlerMenu",
                },

                {
                  id: "13",
                  component: <NotaFiscal />,
                  asMessage: true,
                  trigger: "handlerMenu",
                },
                {
                  id: "menuAjudaInfoPedidosBefore",
                  message: "O que deseja fazer agora?",
                  trigger: "menuAjudaInfoPedidos",
                },

                {
                  id: "14",
                  message: "Fluxo de status",
                  end: true,
                },
                {
                  id: "20",
                  options: [
                    { value: 1, label: "Cartão C&A", trigger: "211" },
                    { value: 2, label: "Campanhas/Promoções", trigger: "22" },
                    {
                      value: 3,
                      label: "Programa de Fidelidade C&A&VC",
                      trigger: "23",
                    },
                    { value: 4, label: "Encontrar Lojas", trigger: "24" },
                    { value: 5, label: "APP C&A", trigger: "25" },
                    { value: 6, label: "Solicitação de Troca", trigger: "26" },
                    { value: 7, label: "Cancelamento", trigger: "27" },
                    { value: 8, label: "Voltar ao menu inicial", trigger: "5" },
                  ],
                  hideInput: true,
                },
                {
                  id: "211",
                  message:
                    "Certo! Por favor, escolha o que você precisa sobre o Cartão C&A.",
                  trigger: "21",
                },
                {
                  id: "21",
                  options: [
                    { value: 1, label: "Contratação de Cartão", trigger: "35" },
                    { value: 2, label: "Assuntos Cartão C&A", trigger: "37" },
                    // { value: 2, label: "Serviços Cartão C&A", trigger: "36" },
                    // { value: 3, label: "Senha do Cartão C&A", trigger: "37" },
                  ],
                },
                {
                  id: "35",
                  component: (
                    <div>
                      {" "}
                      <p>
                        Para contratar o seu Cartão C&A você precisa ir em uma
                        de nossas lojas.{" "}
                        <a
                          href="https://www.cea.com.br/lojas"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Clique aqui
                        </a>{" "}
                        e encontre a loja mais próxima de você!{" "}
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "36",
                  component: (
                    <div>
                      <p>
                        {" "}
                        Para esta informação, você precisa entrar em contato com
                        a Central de Atendimento Bradescard através dos
                        telefones 4004-0127 / 0800-701-0127.{" "}
                        <a
                          href="https://www.bradescard.com.br/SiteBradescard/cea"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          Clique aqui
                        </a>{" "}
                        para acessar o site Bradescard.{" "}
                      </p>{" "}
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "37",
                  component: (
                    <div>
                      {" "}
                      <p>
                        Para informações sobre a senha do cartão C&A, você
                        precisa entrar em contato com a Central de Atendimento
                        Bradescard através dos telefones 4004-0127 /
                        0800-701-0127.{" "}
                        <a
                          href="https://www.bradescard.com.br/SiteBradescard/cea"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          Clique aqui
                        </a>{" "}
                        para acessar o site Bradescard.
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "22",
                  message: `Estamos felizes em ver que você tem interesse em nossas campanhas, promoções e cupons de desconto.`,
                  trigger: "220",
                },
                {
                  id: "220",
                  message: `Vou transferir para um dos nossos especialistas, ele vai te passar mais informações.`,
                  trigger: "1001Promo",
                },
                {
                  id: "220e1",
                  message: `Por favor, aguarde!`,
                  end: true,
                },
                {
                  id: "23",
                  component: (
                    <div>
                      {" "}
                      <p>
                        <a
                          href="https://www.cea.com.br/evc-programa-de-relacionamento"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          Clique aqui
                        </a>{" "}
                        para ver mais informações sobre o programa de fidelidade
                        C&A&VC.
                      </p>{" "}
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "24",
                  component: (
                    <div>
                      {" "}
                      <p>
                        <a
                          href="https://www.cea.com.br/lojas"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          Clique aqui
                        </a>{" "}
                        e encontre a loja mais próxima de você!{" "}
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "25",
                  component: (
                    <div>
                      {" "}
                      <p>
                        {" "}
                        Para baixar o App C&A, acesse{" "}
                        <a
                          href="https://apps.apple.com/br/app/c-a-loja-online-moda-roupas/id1168148250"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          IOS
                        </a>{" "}
                        ou{" "}
                        <a
                          href="https://play.google.com/store/apps/details?id=br.com.cea.appb2c&hl=pt_BR"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Android
                        </a>{" "}
                        .
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "26",
                  message:
                    "Para solicitação de troca de produtos, por favor escolha como foi sua compra para que eu possa te orientar.",
                  trigger: "40",
                },
                {
                  id: "40",
                  options: [
                    {
                      value: 1,
                      label: "Clique e Retire",
                      trigger: "cliqueretire",
                    },
                    {
                      value: 2,
                      label: "Compra Flexível",
                      trigger: "compraflexivel",
                    },
                    { value: 3, label: "Loja Física", trigger: "lojafisica" },
                    {
                      value: 4,
                      label: "Compras online",
                      trigger: "comprasonline",
                    },
                  ],
                },
                {
                  id: "cliqueretire",
                  message: `Você pode fazer suas trocas e devoluções em poucos cliques.`,
                  trigger: "cliqueretire2",
                },
                {
                  id: "cliqueretire2",
                  message: `Veja como é fácil e prático:`,
                  trigger: "cliqueretire3",
                },
                {
                  id: "cliqueretire3",
                  component: (
                    <div>
                      <p>
                        {" "}
                        -&gt; Faça seu login{" "}
                        <a
                          href="https://www.cea.com.br/minha-conta"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          clicando aqui
                        </a>
                        .<br /> -&gt;Clique em "meus pedidos", encontre o pedido
                        desejado e clique no botão "troca e devolução" <br />{" "}
                        -&gt; Selecione os itens que deseja devolver <br />{" "}
                        -&gt; Escolha uma opção de restituição, selecione a
                        "postagem" e confira os dados preenchidos;
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "cliqueretire4",
                },
                {
                  id: "cliqueretire4",
                  message: `Pronto!! Anote seu protocolo de atendimento e o código de postagem;`,
                  trigger: "cliqueretire5",
                },
                {
                  id: "cliqueretire5",
                  component: (
                    <div>
                      <p>
                        Ou se preferir, você pode realizar a troca em uma de{" "}
                        <a
                          href="https://www.cea.com.br/lojas"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          nossas lojas
                        </a>{" "}
                        levando o produto e a nota fiscal.
                      </p>
                    </div>
                  ),
                  asMessage: true,

                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "compraflexivel",
                  component: (
                    <div>
                      {" "}
                      <p>
                        Para troca de produtos adquiridos em lojas físicas,
                        procure o setor de trocas e devoluções em qualquer uma
                        de nossas lojas físicas. Para encontrar a loja mais
                        próxima{" "}
                        <a
                          href="https://www.cea.com.br/lojas"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          clique aqui
                        </a>
                        .{" "}
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "lojafisica",
                  component: (
                    <div>
                      {" "}
                      <p>
                        Para troca de produtos adquiridos em lojas físicas,
                        procure o setor de trocas e devoluções em qualquer uma
                        de nossas lojas físicas. Para encontrar a loja mais
                        próxima{" "}
                        <a
                          href="https://www.cea.com.br/lojas"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {" "}
                          clique aqui
                        </a>
                        .{" "}
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "comprasonline",
                  options: [
                    { value: 1, label: "C&A", trigger: "comprasonlinecea" },
                    {
                      value: 2,
                      label: "Parceiros",
                      trigger: "comprasonlineparceiro",
                    },
                  ],
                },
                {
                  id: "comprasonlinecea",
                  message:
                    "Agora ficou mais fácil e prático fazer suas trocas e \
                        devoluções online. Em poucos cliques você gera um código \
                        de postagem em nosso site e pode devolver gratuitamente  \
                        seus produtos via correios.",
                  trigger: "comprasonlinecea2",
                },
                {
                  id: "comprasonlinecea2",
                  component: (
                    <div>
                      <a
                        href="https://www.cea.com.br/login?returnUrl=https://www.cea.com.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Clique aqui
                      </a>{" "}
                      entre na sua conta e escolha o pedido para solicitar sua
                      troca.
                    </div>
                  ),
                  asMessage: true,
                  trigger: "menuAjudaOutrosAssuntos",
                },
                {
                  id: "comprasonlineparceiro",
                  component: (
                    <div>
                      {" "}
                      <p>
                        Seu pedido foi vendido e enviado por um parceiro C&A.
                        Neste caso é necessario falar com um dos nossos
                        especialistas.
                      </p>
                    </div>
                  ),
                  asMessage: true,
                  trigger: "1000e0",
                },
                // {
                //   id: '27',
                //   message: 'Certo! Para que eu possa localizar seu cadastro, me informe seu CPF ou Número do pedido.',
                //   trigger: 'cpf2',
                // },
                {
                  id: "27",
                  message:
                    "Para continuar, escolha se deseja fazer a consulta por CPF ou número do pedido:",
                  trigger: "27options",
                },
                {
                  id: "27options",
                  options: [
                    { value: 1, label: "CPF", trigger: "27cpf" },
                    {
                      value: 2,
                      label: "Número do pedido",
                      trigger: "27pedido",
                    },
                  ],
                },
                {
                  id: "27cpf",
                  component: <CheckCPFCancel />,
                  asMessage: true,
                  // message:
                  //   "Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:",
                  // trigger: "cpf",
                },
                // {
                //   id: "27cpf",
                //   message:
                //     "Certo! Para que eu possa localizar seu cadastro, me informe seu CPF:",
                //   trigger: "cpf2",
                // },
                {
                  id: "27pedido",
                  message:
                    "Certo! Para que eu possa localizar seu cadastro, me informe seu número do pedido:",
                  trigger: "pedido2",
                },
                {
                  id: "cpf2",
                  validator: (value) => {
                    // if (/([0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[-]?[0-9]{2})|([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/.test(value)) {
                    const cpf_is_valid = valida_cpf(value);
                    if (cpf_is_valid) {
                      return true;
                    } else {
                      return "Insira um CPF válido.";
                    }
                  },
                  user: true,
                  trigger: "899",
                },
                {
                  id: "pedido2",
                  validator: (value) => {
                    // if (/((v)[0-9]{1,8}(cea-)\d{2})/.test(value)) {
                    const pedido_is_valid = valida_pedido(value);
                    if (pedido_is_valid) {
                      return true;
                    } else {
                      return "Insira um n° de pedido válido.";
                    }
                  },
                  user: true,
                  trigger: "100099",
                },

                {
                  id: "899",
                  component: <ListOrderByCpfCancel />,
                  asMessage: true,
                  trigger: "9000",
                },
                {
                  id: "899Pedido",
                  component: <ListOrderByIdCancel />,
                  asMessage: true,
                  trigger: "9000pedido",
                },
                {
                  id: "9000",
                  component: <StepButtonCancel />,
                  waitAction: true,
                },
                {
                  id: "9000pedido",
                  component: <StepButtonCancelPedido />,
                  waitAction: true,
                },
                {
                  id: "100099",
                  component: <StatusCancel />,
                  asMessage: true,
                  trigger: "1000e0",
                },
                {
                  id: "1000e0",
                  message: "Deseja falar agora?",
                  trigger: "1000",
                },
                {
                  id: "1000",
                  options: [
                    {
                      value: 1,
                      label: "Sim, falar com um especialista",
                      trigger: "1001",
                    },
                    { value: 2, label: "Não", trigger: "5" },
                  ],
                },
                {
                  id: "1001",
                  component: <CheckHorario />,
                  asMessage: true,
                  // message:
                  //   "Entendi! Vou transferir para um dos nossos especialistas.",
                  // trigger: "10012",
                },
                {
                  id: "1001Promo",
                  component: <CheckHorarioPromo />,
                  asMessage: true,
                  // message:
                  //   "Entendi! Vou transferir para um dos nossos especialistas.",
                  // trigger: "10012",
                },
                {
                  id: "10012",
                  message: "Só um momento.",
                  trigger: "zendesk",
                  // end: true,
                },
                {
                  id: "zendesk",
                  component: (
                    <ChatZendesk unmountChat={() => setShowChat(false)} />
                  ),

                  // asMessage: true,
                  // trigger: "1000e0",
                },

                {
                  id: "sair",
                  message: "Obrigado por entrar em contato conosco",
                  trigger: "evaluate",
                },
                {
                  id: "off",
                  message: "Obrigado por entrar em contato conosco",
                  trigger: "evaluate",
                },
                {
                  id: "evaluate",
                  message:
                    "Avalie o atendimento para que possamos melhorar nosso serviço!",
                  trigger: "evaluateOptions",
                },
                {
                  id: "notUnderstand",
                  message:
                    "Desculpa, não entendi. Pode refazer sua pergunta de uma forma mais simples? Por exemplo: 'Qual o status do meu Pedido'",
                  trigger: "readIntent",
                },
                {
                  id: "notHarassment",
                  message:
                    "Desculpe não entendi. Estou aqui para te ajudar com informações sobre a C&A.",
                  trigger: "readIntent",
                },
                {
                  id: "evaluateOptions",
                  options: [
                    { value: 1, label: "1", trigger: "finish" },
                    { value: 2, label: "2", trigger: "finish" },
                    { value: 3, label: "3", trigger: "finish" },
                    { value: 4, label: "4", trigger: "finish" },
                    { value: 5, label: "5", trigger: "finish" },
                  ],
                },
                {
                  id: "finish",
                  component: (
                    <Finish
                      unmountChat={() => {
                        setShowChat(true);
                        setIsChatOpen(false);
                      }}
                    />
                  ),
                  asMessage: true,
                  hideInput: true,
                  end: true,
                },
                {
                  id: "menuAjudaOutrosAssuntos",
                  message: "O que deseja fazer agora?",
                  trigger: "menuAjudaOutrosAssuntosButtons",
                },
                {
                  id: "menuAjudaOutrosAssuntosButtons",
                  options: [
                    { value: 1, label: "Voltar ao menu inicial", trigger: "5" },
                    {
                      value: 2,
                      label: "Voltar ao menu anterior",
                      trigger: "20",
                    },
                    {
                      value: 3,
                      label: "Sair",
                      trigger: "sair",
                    },
                  ],
                },
                {
                  id: "menuAjudaInfoPedidos",
                  options: [
                    {
                      value: 1,
                      label: "Voltar ao menu anterior",
                      trigger: "voltaMenuAnteriorMessage",
                    },
                    {
                      value: 2,
                      label: "Voltar ao menu inicial",
                      trigger: "5",
                    },
                    {
                      value: 3,
                      label: "Falar com especialista",
                      trigger: "1001",
                    },
                  ],
                },
                {
                  id: "menuAjudaInfoPedidosStatusComCpf",
                  options: [
                    {
                      value: 1,
                      label: "Voltar ao menu anterior",
                      trigger: "voltaMenuAnteriorMessage",
                    },
                    {
                      value: 2,
                      label: "Voltar ao menu inicial",
                      trigger: "5",
                    },
                    {
                      value: 3,
                      label: "Escolher outro pedido",
                      trigger: "listorderCpf",
                    },
                    {
                      value: 4,
                      label: "Falar com especialista",
                      trigger: "1001",
                    },
                  ],
                },
                {
                  id: "voltaMenuAnteriorMessage",
                  message: "O que deseja fazer agora?",
                  trigger: "11",
                },
                {
                  id: "menuAjudaInfoPedidosStatusComCpf",
                  options: [
                    {
                      value: 1,
                      label: "Voltar ao menu anterior",
                      trigger: "11",
                    },
                    {
                      value: 2,
                      label: "Voltar ao menu inicial",
                      trigger: "5",
                    },
                    {
                      value: 3,
                      label: "Escolher outro pedido",
                      trigger: "listorderCpf",
                    },
                    {
                      value: 4,
                      label: "Falar com especialista",
                      trigger: "1001",
                    },
                  ],
                },

                // IDs para NLP
                {
                  id: "TransferirEspecialista",
                  component: <TransferirEspecialista />,
                  asMessage: true,
                  trigger: "1000",
                },
                {
                  id: "-1",
                  component: <RetryButton />,
                  asMessage: true,
                },
                {
                  id: "nlp_0",
                  message: "Desculpe, não entendi sua mensagem.",
                  trigger: "nlp_1",
                },
                {
                  id: "nlp_1",
                  message: `Tenho informações sobre Pedidos ou Outros Assuntos relacionados ao SAC.`,
                  trigger: "nlp_2",
                },
                {
                  id: "nlp_2",
                  message: "Como posso ajudar?",
                  trigger: "readIntent",
                },
                {
                  id: "nlp_3",
                  message: "Desculpe, não entendi sua mensagem.",
                  trigger: "nlp_4",
                },
                {
                  id: "nlp_4",
                  message: `Tenho informações sobre Pedidos ou Outros Assuntos relacionados ao SAC.`,
                  trigger: "6",
                },
                {
                  id: "-3",
                  component: <RetryButton />,
                  asMessage: true,
                },
              ]}
            />
          </ThemeProvider>
        )}
    </div>
  );
}
