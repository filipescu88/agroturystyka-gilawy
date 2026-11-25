/* ===========================================================
   Agroturystyka Giławy — Obsługa formularzy kontaktowych
   Wysyłka JSON do forms-hub (https://forms.warsztatcyfrowy.pl)
   + tracking Google Ads i PostHog wyłącznie po HTTP 200
   =========================================================== */
(function () {
  var PROD_ENDPOINT = "https://forms.warsztatcyfrowy.pl/api/submit/gilawy";
  var LOCAL_ENDPOINT = "http://127.0.0.1:8083/api/submit/gilawy";

  function getEndpoint(form) {
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return form.getAttribute("data-local-endpoint") || LOCAL_ENDPOINT;
    }
    return form.getAttribute("data-endpoint") || PROD_ENDPOINT;
  }

  function trackSuccess(form, source, hasPhone, hasEmail) {
    var gadsEvent = form.getAttribute("data-gads-event") || "formularz_kontakt";
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: "AW-17350584286/WjOwCJOV_b8cEN7Ps9FA" });
      window.gtag("event", gadsEvent, { method: "form", source: source });
    }
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture("wyslanie_formularza", {
        oferta: source,
        strona: window.location.pathname,
        ma_telefon: hasPhone,
        ma_email: hasEmail
      });
    }
  }

  function initForm(form) {
    var loadedAt = Date.now();
    var statusEl = form.querySelector(".cf-status");
    var submitBtn = form.querySelector('button[type="submit"]');
    var defaultBtnText = submitBtn ? submitBtn.textContent : "Wyślij zapytanie";

    function setStatus(type, htmlContent) {
      if (!statusEl) return;
      statusEl.className = "cf-status cf-status--" + type;
      statusEl.innerHTML = htmlContent;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      var fd = new FormData(form);
      var name = String(fd.get("name") || "").trim();
      var phone = String(fd.get("phone") || "").trim();
      var email = String(fd.get("email") || "").trim();
      var message = String(fd.get("message") || "").trim();
      var source = String(fd.get("source") || form.getAttribute("data-source") || "Kontakt").trim();
      var website = String(fd.get("website") || "").trim();

      if (!phone && !email) {
        setStatus("error", "Podaj numer telefonu lub adres e-mail, abyśmy mogli odpowiedzieć.");
        return;
      }

      var extraFields = {};
      form.querySelectorAll("[data-field-label]").forEach(function (el) {
        var label = el.getAttribute("data-field-label");
        var val = String(el.value || "").trim();
        if (label && val) {
          extraFields[label] = val;
        }
      });

      var payload = {
        name: name,
        phone: phone,
        email: email,
        message: message,
        source: source,
        page_url: window.location.href,
        fields: extraFields,
        website: website,
        elapsed_ms: Date.now() - loadedAt
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Wysyłanie...";
      }
      setStatus("pending", "Wysyłamy Twoje zapytanie...");

      try {
        var res = await fetch(getEndpoint(form), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        var data = {};
        try {
          data = await res.json();
        } catch (_) {
          data = {};
        }

        if (res.ok && data.ok) {
          setStatus(
            "ok",
            "<strong>Dziękujemy!</strong> Twoje zapytanie zostało wysłane — odezwiemy się najszybciej jak to możliwe."
          );
          trackSuccess(form, source, Boolean(phone), Boolean(email));
          form.reset();
          loadedAt = Date.now();
        } else {
          var errMsg = data.error || "Nie udało się wysłać formularza.";
          setStatus(
            "error",
            errMsg +
              ' W razie pilnego pytania zadzwoń: <a href="tel:+48512720750">+48 512 720 750</a> lub napisz na <a href="mailto:agroturystyka@gilawy.pl">agroturystyka@gilawy.pl</a>.'
          );
        }
      } catch (_) {
        setStatus(
          "error",
          'Chwilowy problem z połączeniem. Zadzwoń: <a href="tel:+48512720750">+48 512 720 750</a> lub napisz bezpośrednio na <a href="mailto:agroturystyka@gilawy.pl">agroturystyka@gilawy.pl</a>.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = defaultBtnText;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form.js-contact-form").forEach(initForm);
  });
})();
