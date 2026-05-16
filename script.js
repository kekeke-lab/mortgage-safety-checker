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
  affordabilitySummaryText: document.querySelector("#affordability-summary-text"),
  affordabilityGrid: document.querySelector("#affordability-grid"),
  insightText: document.querySelector("#insight-text"),
  comparisonGrid: document.querySelector("#comparison-grid"),
  rateGrid: document.querySelector("#rate-grid"),
  suggestionList: document.querySelector("#suggestion-list"),
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

function findSafePropertyPrice(values) {
  for (let price = values.propertyPrice; price >= 500; price -= 10) {
    const result = diagnose({ ...values, propertyPrice: price });
    if (result.level === "safe") return price;
  }
  return 0;
}

function findCautionPropertyPrice(values) {
  for (let price = values.propertyPrice; price >= 500; price -= 10) {
    const result = diagnose({ ...values, propertyPrice: price });
    if (result.level !== "danger") return price;
  }
  return 0;
}

function findNeededDownPayment(values) {
  for (let downPayment = values.downPayment; downPayment <= values.propertyPrice; downPayment += 10) {
    const result = diagnose({ ...values, downPayment });
    if (result.level === "safe") return downPayment;
  }
  return values.propertyPrice;
}

function findCautionDownPayment(values) {
  for (let downPayment = values.downPayment; downPayment <= values.propertyPrice; downPayment += 10) {
    const result = diagnose({ ...values, downPayment });
    if (result.level !== "danger") return downPayment;
  }
  return values.propertyPrice;
}

function findOtherDebtReduction(values) {
  for (let otherDebt = values.otherDebt; otherDebt >= 0; otherDebt -= 0.5) {
    const result = diagnose({ ...values, otherDebt });
    if (result.level === "safe") return values.otherDebt - otherDebt;
  }
  return values.otherDebt;
}

function buildSuggestions(values, result) {
  if (result.level === "safe") {
    return [
      "この条件では安全圏です。固定資産税、修繕費、教育費、車の買い替えなどを別枠で見ておくと、さらに判断しやすくなります。",
      "金利が上がった場合も確認したいなら、金利を0.5%から1.0%上げて再試算してみてください。",
    ];
  }

  const safePrice = findSafePropertyPrice(values);
  const cautionPrice = findCautionPropertyPrice(values);
  const neededDownPayment = findNeededDownPayment(values);
  const cautionDownPayment = findCautionDownPayment(values);
  const debtReduction = findOtherDebtReduction(values);
  const suggestions = [];

  if (safePrice > 0 && safePrice < values.propertyPrice) {
    suggestions.push(
      `安全圏に近づけるには、物件価格を約${yenMan(safePrice)}まで下げるのが目安です。`,
    );
  } else if (result.level === "danger" && cautionPrice > 0 && cautionPrice < values.propertyPrice) {
    suggestions.push(
      `まず要注意ラインを抜けるには、物件価格を約${yenMan(cautionPrice)}まで下げるのが目安です。`,
    );
  }

  if (neededDownPayment > values.downPayment && neededDownPayment < values.propertyPrice) {
    suggestions.push(
      `物件価格を変えない場合、自己資金を約${yenMan(neededDownPayment)}まで増やすと安全圏に近づきます。`,
    );
  } else if (
    result.level === "danger" &&
    cautionDownPayment > values.downPayment &&
    cautionDownPayment < values.propertyPrice
  ) {
    suggestions.push(
      `物件価格を変えない場合、自己資金を約${yenMan(cautionDownPayment)}まで増やすと要注意ラインを抜けやすくなります。`,
    );
  }

  if (debtReduction > 0) {
    suggestions.push(
      `他ローン返済を月${yenMan(debtReduction)}ほど減らせると、家計余力が改善します。`,
    );
  }

  if (result.cashLeft < 8) {
    const targetCashLeft = result.level === "danger" ? 3 : 8;
    suggestions.push(
      `月の支出をあと約${yenMan(targetCashLeft - result.cashLeft)}見直せると、判定が一段改善しやすくなります。`,
    );
  }

  suggestions.push(
    "毎月の生活費、固定資産税など、金利を少し厳しめに入れて再試算すると、購入後のブレに備えやすくなります。",
  );

  return suggestions;
}

function renderAffordabilitySummary(result) {
  const safetyBuffer = 8;
  const safetyGap = result.cashLeft - safetyBuffer;
  const isEnough = safetyGap >= 0;

  resultNodes.affordabilitySummaryText.textContent = isEnough
    ? "この条件では、急な支出や固定費の上振れに備える余裕があります。"
    : "まずは月の家計余力を安全圏まで戻す条件を探しましょう。";

  const cards = [
    {
      label: "今の家計余力",
      value: `${yenMan(result.cashLeft)}/月`,
      note: "住宅ローンと固定費を引いた後の目安",
      level: result.level,
    },
    {
      label: isEnough ? "安全圏からの余裕" : "安全圏まで",
      value: isEnough ? `+${yenMan(safetyGap)}/月` : `あと${yenMan(Math.abs(safetyGap))}/月`,
      note: "月8万円の余力を安全圏の目安にしています",
      level: isEnough ? "safe" : result.level,
    },
    {
      label: "返済比率",
      value: `${round(result.paymentRatio, 1)}%`,
      note: "年間返済額が年収に占める割合",
      level: result.level,
    },
  ].map((item) => {
    const card = document.createElement("article");
    card.className = `affordability-card ${item.level === "safe" ? "" : item.level}`;
    card.innerHTML = `
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <p>${item.note}</p>
    `;
    return card;
  });

  resultNodes.affordabilityGrid.replaceChildren(...cards);
}

function comparisonScenarios(values) {
  return [
    { label: "-500万円", price: Math.max(values.propertyPrice - 500, 0), current: false },
    { label: "現在", price: values.propertyPrice, current: true },
    { label: "+500万円", price: values.propertyPrice + 500, current: false },
  ].filter((scenario, index, scenarios) => {
    return scenarios.findIndex((item) => item.price === scenario.price) === index;
  });
}

function renderComparison(values) {
  const cards = comparisonScenarios(values).map((scenario) => {
    const result = diagnose({ ...values, propertyPrice: scenario.price });
    const card = document.createElement("article");
    card.className = `comparison-card ${scenario.current ? "current" : ""} ${result.level === "safe" ? "" : result.level}`;

    card.innerHTML = `
      <strong>${scenario.label}: ${yenMan(scenario.price)}</strong>
      <dl>
        <div>
          <dt>判定</dt>
          <dd>${result.label}</dd>
        </div>
        <div>
          <dt>月返済</dt>
          <dd>${yenMan(result.payment)}</dd>
        </div>
        <div>
          <dt>返済比率</dt>
          <dd>${round(result.paymentRatio, 1)}%</dd>
        </div>
        <div>
          <dt>家計余力</dt>
          <dd>${yenMan(result.cashLeft)}</dd>
        </div>
      </dl>
    `;

    return card;
  });

  resultNodes.comparisonGrid.replaceChildren(...cards);
}

function rateScenarios(values) {
  return [
    { label: "現在", rate: values.rate, current: true },
    { label: "+0.5%", rate: values.rate + 0.5, current: false },
    { label: "+1.0%", rate: values.rate + 1, current: false },
  ];
}

function renderRateRisk(values) {
  const base = diagnose(values);
  const cards = rateScenarios(values).map((scenario) => {
    const result = diagnose({ ...values, rate: scenario.rate });
    const card = document.createElement("article");
    card.className = `rate-card ${scenario.current ? "current" : ""} ${result.level === "safe" ? "" : result.level}`;
    const paymentDiff = result.payment - base.payment;

    card.innerHTML = `
      <strong>${scenario.label}: ${round(scenario.rate, 2)}%</strong>
      <dl>
        <div>
          <dt>判定</dt>
          <dd>${result.label}</dd>
        </div>
        <div>
          <dt>月返済</dt>
          <dd>${yenMan(result.payment)}</dd>
        </div>
        <div>
          <dt>増加額</dt>
          <dd>${scenario.current ? "-" : `+${yenMan(paymentDiff)}`}</dd>
        </div>
        <div>
          <dt>家計余力</dt>
          <dd>${yenMan(result.cashLeft)}</dd>
        </div>
      </dl>
    `;

    return card;
  });

  resultNodes.rateGrid.replaceChildren(...cards);
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

  renderAffordabilitySummary(result);
  renderComparison(values);
  renderRateRisk(values);

  resultNodes.suggestionList.replaceChildren(
    ...buildSuggestions(values, result).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );
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

render();
