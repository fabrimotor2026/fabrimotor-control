function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function removeIframe(iframe) {
  if (iframe?.parentNode) {
    iframe.parentNode.removeChild(iframe);
  }
}

export function printLabelDocument({
  appConfig,
  labelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  numeroCajaAsignado,
  numeroCajaCompleto,
}) {
  return new Promise((resolve, reject) => {
    const rawReference = String(
      appConfig?.reference || "F-1012"
    ).trim();

    const reference = escapeHtml(rawReference);

    const fileReference =
      rawReference
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "") || "F1012";

    const printTitle = [
      fileReference,
      String(numeroCajaCompleto || "").trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const safePrintTitle = escapeHtml(printTitle);
    const originalDocumentTitle = document.title;

    const partCode = escapeHtml(
      appConfig?.partCode || ""
    );

    const boxPrefix = escapeHtml(
      appConfig?.boxPrefix || "FB-26"
    );

    const threadText = escapeHtml(
      appConfig?.threadText || "ROSCA DERECHA"
    );

    const safeLabelForm = {
      fab1: escapeHtml(labelForm?.fab1),
      col1: escapeHtml(labelForm?.col1),
      cant1: escapeHtml(labelForm?.cant1),

      fab2: escapeHtml(labelForm?.fab2),
      col2: escapeHtml(labelForm?.col2),
      cant2: escapeHtml(labelForm?.cant2),

      operario1: escapeHtml(labelForm?.operario1),
      operario2: escapeHtml(labelForm?.operario2),
    };

    const safeTotalCaja = escapeHtml(totalCaja);
    const safeNumeroSemana = escapeHtml(numeroSemana);
    const safeNumeroDia = escapeHtml(numeroDia);
    const safeNumeroCajaAsignado = escapeHtml(
      numeroCajaAsignado
    );
    const safeNumeroCajaCompleto = escapeHtml(
      numeroCajaCompleto
    );

    const iframe = document.createElement("iframe");

    iframe.setAttribute("title", "Impresión de etiqueta");
    iframe.setAttribute("aria-hidden", "true");

    Object.assign(iframe.style, {
      position: "fixed",
      right: "100%",
      bottom: "100%",
      width: "1200px",
      height: "800px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    });

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const printDocument = iframe.contentDocument;

    if (!printWindow || !printDocument) {
      removeIframe(iframe);

      reject(
        new Error(
          "No se ha podido preparar el documento de impresión."
        )
      );

      return;
    }

    let finished = false;

    const finishPrinting = () => {
      if (finished) return;

      finished = true;
      document.title = originalDocumentTitle;

      printWindow.removeEventListener(
        "afterprint",
        finishPrinting
      );

      window.setTimeout(() => {
        removeIframe(iframe);
        resolve();
      }, 100);
    };

    const failPrinting = (error) => {
      if (finished) return;

      finished = true;
      document.title = originalDocumentTitle;

      printWindow.removeEventListener(
        "afterprint",
        finishPrinting
      );

      removeIframe(iframe);

      reject(
        error instanceof Error
          ? error
          : new Error(
              "No se ha podido imprimir la etiqueta."
            )
      );
    };

    try {
      printWindow.addEventListener(
        "afterprint",
        finishPrinting
      );

      printDocument.open();

      printDocument.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <title>${safePrintTitle}</title>

            <style>
              * {
                box-sizing: border-box;
              }

              html,
              body {
                margin: 0;
                padding: 0;
                background: #ffffff;
              }

              body {
                padding: 20px;
                font-family: Arial, sans-serif;
                color: #000000;
              }

              .label {
                width: 1100px;
                min-height: 650px;
                border: 4px solid #000000;
                padding: 20px;
              }

              .top {
                display: grid;
                grid-template-columns: 1fr 1fr;
                align-items: center;
                border-bottom: 4px solid #000000;
                padding-bottom: 14px;
                font-size: 54px;
                font-weight: 900;
              }

              .right {
                text-align: right;
              }

              .rows {
                margin-top: 22px;
                border-bottom: 4px solid #000000;
                padding-bottom: 18px;
              }

              .data-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 18px;
                margin-top: 14px;
                font-size: 42px;
                font-weight: 900;
              }

              .data-row div {
                min-height: 56px;
                border: 2px solid #000000;
                padding: 12px 18px;
              }

              .total {
                margin-top: 18px;
                border-top: 4px solid #000000;
                border-bottom: 4px solid #000000;
                padding: 12px;
                text-align: center;
                font-size: 38px;
                font-weight: 900;
              }

              .line {
                margin-top: 18px;
                font-size: 30px;
                font-weight: 900;
              }

              .week {
                display: grid;
                grid-template-columns: 1fr 1fr;
                margin-top: 18px;
                text-align: center;
                font-size: 30px;
                font-weight: 900;
              }

              .box {
                display: grid;
                grid-template-columns: 1fr 1fr;
                margin-top: 18px;
                border-top: 4px solid #000000;
                border-bottom: 4px solid #000000;
                padding: 12px;
                font-size: 40px;
                font-weight: 900;
              }

              .thread {
                margin-top: 40px;
                text-align: center;
                font-size: 72px;
                font-weight: 900;
                letter-spacing: 2px;
              }

              @page {
                margin: 0;
              }

              @media print {
                html,
                body {
                  margin: 0;
                  padding: 0;
                }

                body {
                  padding: 0;
                }
              }
            </style>
          </head>

          <body>
            <div class="label">
              <div class="top">
                <div>${reference}</div>

                <div class="right">
                  ${partCode} Ⓢ
                </div>
              </div>

              <div class="rows">
                <div class="data-row">
                  <div>
                    <strong>FAB.</strong>
                    ${safeLabelForm.fab1}
                  </div>

                  <div>
                    <strong>COL.</strong>
                    ${safeLabelForm.col1}
                  </div>

                  <div>
                    <strong>CANT.</strong>
                    ${safeLabelForm.cant1}
                  </div>
                </div>

                <div class="data-row">
                  <div>
                    <strong>FAB.</strong>
                    ${safeLabelForm.fab2}
                  </div>

                  <div>
                    <strong>COL.</strong>
                    ${safeLabelForm.col2}
                  </div>

                  <div>
                    <strong>CANT.</strong>
                    ${safeLabelForm.cant2}
                  </div>
                </div>
              </div>

              <div class="total">
                Nº DE PIEZAS TOTAL:
                ${safeTotalCaja}
              </div>

              <div class="line">
                Nº OPERARIO:
                ${safeLabelForm.operario1}

                ${
                  safeLabelForm.operario2
                    ? ` / ${safeLabelForm.operario2}`
                    : ""
                }
              </div>

              <div class="week">
                <div>
                  SEMANA: ${safeNumeroSemana}
                </div>

                <div>
                  DÍA: ${safeNumeroDia}
                </div>
              </div>

              <div class="box">
                <div>
                  Nº Caja ${boxPrefix}
                </div>

                <div class="right">
                  ${safeNumeroCajaAsignado}
                </div>
              </div>

              <div class="thread">
                ${threadText}
              </div>
            </div>
          </body>
        </html>
      `);

      printDocument.close();

      const startPrinting = () => {
        try {
          /*
           * Chrome y Edge toman el nombre sugerido del PDF
           * desde el título del documento principal cuando
           * la impresión se lanza desde un iframe.
           */
          document.title = printTitle;
          printDocument.title = printTitle;

          printWindow.focus();
          printWindow.print();

          /*
           * En Chrome y Edge, print() vuelve cuando se
           * cierra el cuadro de impresión.
           *
           * afterprint suele ejecutarse, pero esta llamada
           * garantiza que la Promise también termine si el
           * navegador no lanza correctamente ese evento.
           */
          window.setTimeout(
            finishPrinting,
            150
          );
        } catch (error) {
          failPrinting(error);
        }
      };

      /*
       * Dejamos que el navegador termine de renderizar
       * completamente el contenido del iframe.
       */
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(startPrinting);
      });
    } catch (error) {
      failPrinting(error);
    }
  });
}
