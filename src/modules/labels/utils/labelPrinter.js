export function printLabelDocument({
  printWindow,
  appConfig,
  labelForm,
  totalCaja,
  numeroSemana,
  numeroDia,
  numeroCajaAsignado,
  numeroCajaCompleto,
}) {
  if (!printWindow) {
    throw new Error("No se ha podido abrir la ventana de impresión.");
  }

  const reference = appConfig.reference || "F-1012";
  const partCode = appConfig.partCode || "";
  const boxPrefix = appConfig.boxPrefix || "FB-26";
  const threadText = appConfig.threadText || "ROSCA DERECHA";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${numeroCajaCompleto}</title>

        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #000;
          }

          .label {
            width: 1100px;
            min-height: 650px;
            border: 4px solid #000;
            padding: 20px;
          }

          .top {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
            border-bottom: 4px solid #000;
            padding-bottom: 14px;
            font-size: 54px;
            font-weight: 900;
          }

          .right {
            text-align: right;
          }

          .rows {
            margin-top: 22px;
            border-bottom: 4px solid #000;
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
            border: 2px solid #000;
            padding: 12px 18px;
          }

          .total {
            margin-top: 18px;
            border-top: 4px solid #000;
            border-bottom: 4px solid #000;
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
            border-top: 4px solid #000;
            border-bottom: 4px solid #000;
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

          @media print {
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
            <div class="right">${partCode} Ⓢ</div>
          </div>

          <div class="rows">
            <div class="data-row">
              <div><strong>FAB.</strong> ${labelForm.fab1 || ""}</div>
              <div><strong>COL.</strong> ${labelForm.col1 || ""}</div>
              <div><strong>CANT.</strong> ${labelForm.cant1 || ""}</div>
            </div>

            <div class="data-row">
              <div><strong>FAB.</strong> ${labelForm.fab2 || ""}</div>
              <div><strong>COL.</strong> ${labelForm.col2 || ""}</div>
              <div><strong>CANT.</strong> ${labelForm.cant2 || ""}</div>
            </div>
          </div>

          <div class="total">
            Nº DE PIEZAS TOTAL: ${totalCaja}
          </div>

          <div class="line">
            Nº OPERARIO: ${labelForm.operario1 || ""}
            ${labelForm.operario2 ? ` / ${labelForm.operario2}` : ""}
          </div>

          <div class="week">
            <div>SEMANA: ${numeroSemana}</div>
            <div>DÍA: ${numeroDia}</div>
          </div>

          <div class="box">
            <div>Nº Caja ${boxPrefix}</div>
            <div class="right">${numeroCajaAsignado}</div>
          </div>

          <div class="thread">${threadText}</div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}