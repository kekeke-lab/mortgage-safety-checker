const defaults = {
  income: 500,
  downPayment: 300,
  propertyPrice: 3500,
  livingCost: 22,
  otherDebt: 2,
  rate: 1.2,
  years: 35,
  housingExtras: 2,
};

const form = document.querySelector("#mortgage-form");
const resetButton = document.querySelector("#reset-button");
const copySnsButton = document.querySelector("#copy-sns-button");

const fields = Object.fromEntries(
  Object.keys(defaults).map((key) => [key, document.querySelector(`#${key}`)]),
);

const resultNodes = {
  statusBand: document.querySelector("#status-band"),
  statusLabel: document.querySelector("#status-label"),
  statusTitle: document.querySelector("#status-title"),
  monthlyPayment: document.querySelector("#monthly-payment"),
  paymentRatio: document.querySelector("#payment-ratio"),
  cashLeft: document.querySelector("#cash-left"),
  loanAmount: document.querySelector("#loan-amount"),
  insightText: document.querySelector("#insight-text"),
  snsText: document.querySelector("#sns-text"),
};

function yenMan(value) {
  return `${round(value, 1).toLocaleString("ja-JP")}万円`;
}

function round(value, digits = 0) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function monthlyPayment(loanAmountMan, annualRate, years) {
  const principal = loanAmountMan * 10000;
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;

  if (months <= 0 || principal <= 0) return 0;
  if (monthlyRate === 0) return principal / months / 10000;

  const payment =
    (principal * monthlyRate * (1 + monthlyRate) ** months) /
    ((1 + monthlyRate) ** months - 1);

  return payment / 10000;
}

function estimatedMonthlyTakeHome(incomeMan) {
  if (incomeMan <= 300) return incomeMan * 0.82 / 12;
  if (incomeMan <= 600) return incomeMan * 0.78 / 12;
  if (incomeMan <= 900) return incomeMan * 0.74 / 12;
  return incomeMan * 0.7 / 12;
}

function readValues() {
  return Object.fromEntries(
    Object.entries(fields).map(([key, node]) => [key, Number(node.value) || 0]),
  );
}

function diagnose(values) {
  const loanAmount = Math.max(values.propertyPrice - values.downPayment, 0);
  const payment = monthlyPayment(loanAmount, values.rate, values.years);
  const takeHome = estimatedMonthlyTakeHome(values.income);
  const housingTotal = payment + values.housingExtras;
  const totalDebt = housingTotal + values.otherDebt;
  const cashLeft = takeHome - values.livingCost - totalDebt;
  const paymentRatio = values.income > 0 ? (payment * 12) / values.income * 100 : 0;
  const housingRatio = takeHome > 0 ? housingTotal / takeHome * 100 : 0;

  let level = "safe";
  let label = "安全圏";
  let title = "かなり余裕を見た返済計画です";

  if (paymentRatio > 28 || housingRatio > 35 || cashLeft < 3) {
    level = "danger";
    label = "要注意";
    title = "生活費や予備費を圧迫しやすい返済計画です";
  } else if (paymentRatio > 22 || housingRatio > 28 || cashLeft < 8) {
    level = "caution";
    label = "注意";
    title = "家計変動に備えて条件を見直したい水準です";
  }

  return {
    loanAmount,
    payment,
    takeHome,
    cashLeft,
    paymentRatio,
    housingRatio,
    level,
    label,
    title,
  };
}

function render() {
  const values = readValues();
  const result = diagnose(values);

  resultNodes.statusBand.className = `status-band ${result.level === "safe" ? "" : result.level}`;
  resultNodes.statusLabel.textContent = result.label;
  resultNodes.statusTitle.textContent = result.title;
  resultNodes.monthlyPayment.textContent = `${yenMan(result.payment)}/月`;
  resultNodes.paymentRatio.textContent = `${round(result.paymentRatio, 1)}%`;
  resultNodes.cashLeft.textContent = `${yenMan(result.cashLeft)}/月`;
  resultNodes.loanAmount.textContent = yenMan(result.loanAmount);

  const safeLine =
    result.level === "safe"
      ? "この条件なら返済比率は抑えめです。固定資産税、修繕費、教育費などの変動費も別枠で見ておくと安心です。"
      : result.level === "caution"
        ? "返済自体は現実的ですが、生活費や金利上昇で余裕が削られやすい水準です。物件価格、頭金、返済年数のどれかを調整すると安定します。"
        : "返済比率または家計余力に赤信号があります。物件価格を下げる、頭金を増やす、他ローンを整理するなど、購入前に再試算したい条件です。";

  resultNodes.insightText.textContent = `推定手取りは月${yenMan(result.takeHome)}。住宅ローン返済と固定費を引いた後の家計余力は月${yenMan(result.cashLeft)}です。${safeLine}`;

  resultNodes.snsText.textContent = `年収${values.income}万円で${values.propertyPrice}万円の家を買うと、毎月返済は約${yenMan(result.payment)}。返済比率は${round(result.paymentRatio, 1)}%。「借りられる額」より「返しても残る額」を見るのが大事。`;
}

function resetDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    fields[key].value = value;
  });
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", render);
});

resetButton.addEventListener("click", resetDefaults);

copySnsButton.addEventListener("click", async () => {
  const text = resultNodes.snsText.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copySnsButton.textContent = "コピー済み";
    copySnsButton.classList.add("copied");
  } catch {
    copySnsButton.textContent = "選択してコピー";
    resultNodes.snsText.setAttribute("tabindex", "-1");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(resultNodes.snsText);
    selection.removeAllRanges();
    selection.addRange(range);
    resultNodes.snsText.focus();
  }

  window.setTimeout(() => {
    copySnsButton.textContent = "コピー";
    copySnsButton.classList.remove("copied");
  }, 1800);
});

render();
