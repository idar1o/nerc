document.addEventListener("DOMContentLoaded", () => {
  /* -------------------- ДАННЫЕ -------------------- */
  const providers = [
    { name: "Водоканал", img: "./images/vodokonal.png", code: "water" },
    { name: "Теплосеть", img: "./images/teploset.png", code: "heating" },
    { name: "Тазалык", img: "./images/tazalyk.png", code: "sewerage" },
  ];

  const API_URL = "https://ners.billing.kg/ws/api/v1/clients/temp/estate";
  const username = "admin-fr";
  const password = "admin";
  const basicAuth = "Basic " + btoa(`${username}:${password}`);

  /* -------------------- ЭЛЕМЕНТЫ -------------------- */
  const listContainer = document.getElementById("providers-list");
  const selectedSection = document.getElementById("selected-provider");
  const form = document.querySelector(".form");
  let input = document.getElementById("form-input"); // будет пересоздаваться
  let submitBtn = document.querySelector(".form-button");

  // Модалка
  const modal = document.getElementById("modal");
  const modalTitleEl = document.getElementById("modal-title");
  const modalTextEl = document.getElementById("modal-text");

  const logoEl = document.querySelector("header img");
  if (logoEl) {
    logoEl.style.cursor = "pointer"; // курсор-рука для наглядности
    logoEl.addEventListener("click", () => {
      window.location.reload();
    });
  }

  const openModal = (title = "Ошибка", text = "Произошла ошибка") => {
    if (modalTitleEl) modalTitleEl.textContent = title;
    if (modalTextEl) modalTextEl.textContent = text;
    modal.classList.add("is-open");
  };

  const closeModal = () => modal.classList.remove("is-open");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* -------------------- ВЫБОР ПРОВАЙДЕРА -------------------- */
  const userSelection = { providerCode: null };

  // Рендер карточек провайдеров
  providers.forEach((p) => {
    const card = document.createElement("div");
    card.className = "provider-card";
    card.dataset.providerCode = p.code;

    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.name;

    const label = document.createElement("p");
    label.textContent = p.name;

    card.append(img, label);
    listContainer.appendChild(card);
  });

  // Обработка выбора провайдера
  listContainer.querySelectorAll(".provider-card").forEach((card) => {
    card.addEventListener("click", () => {
      listContainer.querySelectorAll(".provider-card").forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
      userSelection.providerCode = card.dataset.providerCode;
      selectedSection.style.display = "flex";
    });
  });
  if (window.innerWidth <= 768) {
    const inputField = document.getElementById("form-input");
    const providersSection = document.querySelector(".welcome");
    const selectedProvider = document.getElementById("selected-provider");

    inputField?.addEventListener("focus", () => {
      if (providersSection && selectedProvider) {
        providersSection.classList.add("hidden"); // скрываем список
        selectedProvider.classList.add("active"); // показываем форму сверху
        selectedProvider.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    inputField?.addEventListener("blur", () => {
      setTimeout(() => {
        if (providersSection && selectedProvider) {
          providersSection.classList.remove("hidden"); // возвращаем список
          selectedProvider.classList.remove("active"); // скрываем фиксированную форму
        }
      }, 200); // небольшая задержка для клика на кнопку
    });
  }

  /* -------------------- АКТИВАЦИЯ КНОПКИ SUBMIT -------------------- */
  input.addEventListener("input", () => {
    submitBtn.disabled = input.value.trim() === "";
  });

  /* -------------------- ВСПОМОГАТЕЛЬНЫЕ -------------------- */
  const replaceInputWithStatic = (accountValue) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-input-static";
    wrapper.innerHTML = `
        <p>Лицевой счёт</p>
        <p>${accountValue}</p>
      `;
    input.replaceWith(wrapper);
  };

  const replaceButtonWithMessage = () => {
    submitBtn.outerHTML = `
        <div class="form-success-msg">
          Проверьте данные и перейдите к оплате
        </div>
      `;
  };

  function renderClientInfo(data, fallbackAccount) {
    let info = document.getElementById("client-info");
    if (info) info.remove();

    const singleAccount = data?.singleAccount || fallbackAccount || "";
    const address = data?.address || "";
    const fullName = data?.fullName || "";
    const period = data?.period || "";
    const debt = data?.debt || "";

    const html = `
        <div id="client-info" class="client-info">
          <div>
            <p>Единый лицевой счёт</p>
            <p>${singleAccount}</p>
          </div>
          <div>
            <p>Адрес</p>
            <p>${address}</p>
          </div>
          <div>
            <p>Плательщик</p>
            <p>${fullName}</p>
          </div>
          <div class="client-info__actions">
            <button type="button" class="btn-pay">Перейти к оплате</button>
            <button type="button" class="btn-reset">Другой лицевой счёт</button>
          </div>
        </div>
      `;

    const msg = form.querySelector(".form-success-msg");
    if (msg) {
      msg.insertAdjacentHTML("afterend", html);
    } else {
      form.insertAdjacentHTML("beforeend", html);
    }

    // кнопка "Другой лицевой счёт" — шаг назад к форме
    const resetBtn = document.querySelector(".btn-reset");
    resetBtn.addEventListener("click", () => {
      resetFormState();
    });

    // кнопка "Перейти к оплате"
    const payBtn = document.querySelector(".btn-pay");
    payBtn.addEventListener("click", () => {
      const main = document.querySelector("main");
      const hasPdf = Boolean(data?.downloadURLPdf);

      // аккуратно парсим сумму долга (строки вида "1352,82", "1352.82", с пробелами)
      const parseDebt = (v) => {
        if (v == null) return NaN;
        const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : NaN;
      };
      const debtValue = parseDebt(data?.debt);
      const isBlocked = Number.isFinite(debtValue) && (debtValue <= 0 || debtValue > 300000);

      // если нет PDF — экран ошибки (форма не затирается)
      if (!hasPdf) {
        const welcome = document.querySelector(".welcome");
        if (welcome) welcome.style.display = "none";
        selectedSection.style.display = "none";

        const errorSection = document.createElement("section");
        errorSection.className = "payment-info payment-info--error";
        errorSection.innerHTML = `
            <h1>Квитанция не найдена</h1>
            <p>К сожалению что-то пошло не так. Повторите попытку позже.</p>
            <button class="back-to-input">Ввести лицевой счёт</button>
          `;
        main.appendChild(errorSection);

        const backBtn = errorSection.querySelector(".back-to-input");
        backBtn.addEventListener("click", () => {
          errorSection.remove();
          if (welcome) welcome.style.display = "";
          selectedSection.style.display = "flex";
          resetFormState();
          selectedSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        return;
      }

      // нормальный сценарий — собрать экран оплаты:
      main.innerHTML = `
        <section class="payment-info">
          <h1>Квитанция готова</h1>

          <div class="payment-info__actions">
            <button class="open">Открыть квитанцию</button>
<button id="download-pdf" class="btn-secondary">
              <img src="./images/pdf.svg" />
              <p>Скачать PDF</p>
            </button>
          </div>

          <h2>Вы можете оплатить её через QR</h2>

          <div class="payment-info__detail">
            <div><p>Единый лицевой счёт</p><p>${singleAccount}</p></div>
            <div><p>Адрес</p><p>${address}</p></div>
            <div><p>Плательщик</p><p>${fullName}</p></div>
            <div><p>Период</p><p>${period}</p></div>
            <div><p>Задолженность (сом)</p><p>${data?.debt ?? ""}</p></div>
          </div>

          ${(() => {
            // показываем QR + кнопку "Оплатить", только если оплата НЕ заблокирована
            if (!isBlocked) {
              return `
<div class="payment-info__qr-block">
  <div class="payment-info__qr">
    <ol>
      <li>Откройте приложение банка</li>
      <li>Откройте сканер QR</li>
      <li>Отсканируйте данный QR-код</li>
      <li>Подтвердите оплату</li>
    </ol>

    <div class="qr-wrapper">
      <img id="qr-image" src="${data.qrCodeURL || ""}" alt="QR-код для оплаты" />
      <button id="download-qr" class="btn-secondary">
      Скачать
      </button>
    </div>
  </div>
</div>


<div class="payment-info__footer">
  <div class="payment-info__buttons">
  <button class="btn-back">Назад</button>
  <button class="btn-pay-main">Оплатить</button>
  </div>
  <p>
    Внимание! Оплата производится по единому лицевому счёту за всех поставщиков. 
    Вы выбираете поставщика только для просмотра деталей по нему.
  </p>
</div>



                `;
            }

            // иначе — выводим сообщение "Оплата недоступна…"
            return `
                <div class="payment-info__blocked">
                  <p>Оплата недоступна: переплата, 0 сом или сумма свыше 300 000 сом. 
                  Для уточнения обратитесь в свою обслуживающую организацию по г. Токмок.</p>
                </div>
              `;
          })()}
        </section>
      `;
      //????????????????????? Скачать QR
      const qrDownloadBtn = document.getElementById("download-qr");
      if (qrDownloadBtn) {
        qrDownloadBtn.addEventListener("click", async () => {
          const qrImage = document.getElementById("qr-image");
          if (!qrImage || !qrImage.src) return;

          try {
            // Получаем файл как blob
            const response = await fetch(qrImage.src, { mode: "cors" });
            if (!response.ok) throw new Error("Ошибка при загрузке QR");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Создаем ссылку и кликаем по ней
            const link = document.createElement("a");
            link.href = url;
            link.download = "qr-code.png"; // имя файла
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Чистим временный URL
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Ошибка при скачивании QR:", err);
            alert("Не удалось скачать QR. Попробуйте снова.");
          }
        });
      }

      // const qrDownloadBtnv1 = document.getElementById("download-qr");
      // if (qrDownloadBtnv1) {
      //   qrDownloadBtn.addEventListener("click", async () => {
      //     const qrImage = document.getElementById("qr-image");
      //     if (!qrImage) return;

      //     try {
      //       // Получаем картинку как blob
      //       const response = await fetch(qrImage.src, { mode: "cors" });
      //       const blob = await response.blob();

      //       // Создаем временный объект URL
      //       const link = document.createElement("a");
      //       link.href = URL.createObjectURL(blob);
      //       link.download = "qr-code.png"; // имя файла при скачивании
      //       document.body.appendChild(link);
      //       link.click();
      //       document.body.removeChild(link);

      //       // Удаляем временный объект
      //       URL.revokeObjectURL(link.href);
      //     } catch (err) {
      //       console.error("Ошибка при скачивании QR:", err);
      //       alert("Не удалось скачать QR. Попробуйте снова.");
      //     }
      //   });
      // }

      // Кнопка "Назад" — вернуться на главную
      const backBtn = document.querySelector(".btn-back");
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          window.location.reload(); // возвращаем на главную
        });
      }

      // Скачать PDF (привяжется, только если кнопка есть в DOM)
      const downloadBtn = document.getElementById("download-pdf");
      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          const link = document.createElement("a");
          link.href = data.downloadURLPdf;
          link.download = "Квитанция.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      // Кнопка "Сохранить QR"
      // Кнопка "Сохранить QR"
      // Кнопка "Сохранить QR"
      const saveQrBtn = document.getElementById("save-qr");
      if (saveQrBtn) {
        saveQrBtn.addEventListener("click", async () => {
          const qrImage = document.getElementById("qr-image");
          if (!qrImage) return;

          try {
            const response = await fetch(qrImage.src);
            const blob = await response.blob();

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "qr-code.png"; // имя файла
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(link.href);
          } catch (err) {
            console.error("Ошибка сохранения QR:", err);
            alert("Не удалось сохранить QR. Попробуйте снова.");
          }
        });
      }

      const openBtn = document.querySelector(".open");
      if (openBtn) {
        openBtn.addEventListener("click", () => {
          window.open(data.openURLPdf || data.downloadURLPdf, "_blank");
        });
      }

      const payActionBtn = document.querySelector(".btn-pay-main"); // именно Оплатить
      if (payActionBtn) {
        payActionBtn.addEventListener("click", () => {
          if (data?.deeplinkURL) {
            window.open(data.deeplinkURL, "_blank");
          } else {
            alert("Ссылка на оплату не найдена");
          }
        });
      }

      // !!!!!!Кнопка "Скачать QR в галерею"
      // const qrDownloadBtn = document.getElementById("download-qr");
      // if (qrDownloadBtn) {
      //   qrDownloadBtn.addEventListener("click", () => {
      //     const qrImage = document.getElementById("qr-image");
      //     if (!qrImage) return;

      //     const link = document.createElement("a");
      //     link.href = qrImage.src;
      //     link.download = "qr-code.png";
      //     document.body.appendChild(link);
      //     link.click();
      //     document.body.removeChild(link);
      //   });
      // }
    });
  }

  // Шаг назад: вернуть форму (инпут + кнопка), сделать провайдеров кликабельными
  const resetFormState = () => {
    if (!form) return;

    // убрать client-info
    const info = document.getElementById("client-info");
    if (info) info.remove();

    // убрать сообщение "Проверьте данные..."
    const msg = form.querySelector(".form-success-msg");
    if (msg) msg.remove();

    // восстановить input
    if (!document.getElementById("form-input")) {
      const inputEl = document.createElement("input");
      inputEl.type = "number";
      inputEl.type = "text";
      inputEl.id = "form-input";
      inputEl.className = "form-input";
      inputEl.placeholder = "Лицевой счёт";
      inputEl.required = true;

      const staticBlock = form.querySelector(".form-input-static");
      if (staticBlock) staticBlock.replaceWith(inputEl);

      input = document.getElementById("form-input");
      input.addEventListener("input", () => {
        submitBtn.disabled = input.value.trim() === "";
      });
    } else {
      // если input есть — очистим и задисейблим кнопку
      input.value = "";
      submitBtn.d;
    }

    // восстановить кнопку
    if (!form.querySelector(".form-button")) {
      const btn = document.createElement("button");
      btn.type = "submit";
      btn.className = "form-button";
      btn.textContent = "Подтвердить";
      btn.disabled = true;
      form.appendChild(btn);
      submitBtn = form.querySelector(".form-button");
    }

    // снова сделать провайдеров кликабельными
    listContainer.querySelectorAll(".provider-card").forEach((card) => {
      card.classList.remove("disabled");
      card.style.pointerEvents = "";
    });

    // показываем секцию с формой
    selectedSection.style.display = "flex";
  };

  /* -------------------- ОТПРАВКА ФОРМЫ -------------------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!userSelection.providerCode) {
      alert("Пожалуйста, выберите поставщика услуг.");
      return;
    }

    const account = input.value.trim();
    if (!account) {
      alert("Введите корректный лицевой счёт.");
      return;
    }

    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Подождите...";
    submitBtn.d;

    const body = { typeSupplier: userSelection.providerCode, account };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        alert(text || `Ошибка запроса (HTTP ${response.status})`);
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = account.trim() === "";
        return;
      }

      const data = await response.json().catch(() => ({}));

      // code:0 — показываем модалку и выходим
      if (typeof data?.code !== "undefined" && Number(data.code) === 0) {
        openModal("Лицевой счёт не найден", "Перепроверьте данные и попробуйте снова.");
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = account.trim() === "";
        return;
      }

      // успех
      replaceButtonWithMessage();
      const accountToShow = data?.singleAccount || account;
      replaceInputWithStatic(accountToShow);
      renderClientInfo(data, accountToShow);

      // блокируем выбор провайдера до шага "другой лицевой счёт"
      listContainer.querySelectorAll(".provider-card").forEach((card) => {
        if (!card.classList.contains("selected")) {
          card.classList.add("disabled");
        }
        card.style.pointerEvents = "none";
      });
    } catch (err) {
      console.error("Network error:", err);
      alert(err?.message || "Ошибка сети. Попробуйте снова.");
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = account.trim() === "";
    }
  });
});
if (window.innerWidth <= 768) {
  const inputField = document.getElementById("form-input");
  const providersSection = document.querySelector(".welcome");
  const selectedProvider = document.getElementById("selected-provider");

  inputField?.addEventListener("focus", () => {
    if (providersSection && selectedProvider) {
      providersSection.classList.add("hidden");
      selectedProvider.classList.add("active");
      selectedProvider.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  inputField?.addEventListener("blur", () => {
    setTimeout(() => {
      if (providersSection && selectedProvider) {
        providersSection.classList.remove("hidden");
        selectedProvider.classList.remove("active");
      }
    }, 200);
  });
}
