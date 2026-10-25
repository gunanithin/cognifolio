<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import * as pdfjsLib from 'pdfjs-dist';
  import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  import CIcon from '../icons/CIcon.svelte';

  // Props
  export let fileUrl = '';
  export let fileType = 'pdf';
  export let rawText = '';
  export let highlightQuery = '';

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

  let canvasRef;
  let canvasContainerRef;
  let textContainerRef;
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 1;
  let zoomScale = 1.25;
  let isLoading = false;
  let renderTask = null;
  let viewMode = 'canvas'; // 'canvas' | 'text'

  // Canvas Highlighting State
  let highlightBoxes = [];
  let locateStatus = '';
  let isLocating = false;
  let currentQueryLabel = '';

  // Multi-format Category & State
  function getFileCategory(type) {
    if (!type) return 'pdf';
    const clean = type.toLowerCase().replace(/^\./, '').trim();
    if (clean === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(clean)) return 'image';
    if (['xlsx', 'xls', 'csv'].includes(clean)) return 'spreadsheet';
    if (['docx', 'doc'].includes(clean)) return 'docx';
    return 'text';
  }

  $: fileCategory = getFileCategory(fileType);

  // Multi-format viewer state
  let imageZoom = 1.0;
  let imageContainerRef;
  let gridContainerRef;
  let readerContainerRef;

  let parsedSheets = [];
  let activeSheetIndex = 0;
  let gridFilterQuery = '';

  $: if (fileCategory === 'spreadsheet' && rawText) {
    parsedSheets = parseSpreadsheetsFromText(rawText);
    if (activeSheetIndex >= parsedSheets.length) {
      activeSheetIndex = 0;
    }
  }

  $: activeSheet = parsedSheets[activeSheetIndex] || { name: 'Sheet 1', headers: [], rows: [] };

  $: filteredRows = (activeSheet.rows || []).filter((row) => {
    if (!gridFilterQuery.trim()) return true;
    const q = gridFilterQuery.toLowerCase();
    return row.some((cell) => String(cell).toLowerCase().includes(q));
  });

  // React to fileUrl changes
  $: if (fileUrl && fileCategory === 'pdf') {
    loadPdf(fileUrl);
  }

  // React to highlightQuery changes
  $: if (highlightQuery) {
    handleQueryHighlight(highlightQuery);
  } else {
    highlightBoxes = [];
    locateStatus = '';
    currentQueryLabel = '';
  }

  onMount(() => {
    if (fileUrl && fileCategory === 'pdf') {
      loadPdf(fileUrl);
    }
  });

  onDestroy(() => {
    if (renderTask) {
      renderTask.cancel();
    }
  });

  async function loadPdf(url) {
    isLoading = true;
    locateStatus = '';
    highlightBoxes = [];
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      currentPage = 1;
      await renderPage(currentPage);

      if (highlightQuery) {
        await handleQueryHighlight(highlightQuery);
      }
    } catch (err) {
      console.warn('Could not load PDF canvas (falling back to text reader):', err);
      viewMode = 'text';
    } finally {
      isLoading = false;
    }
  }

  async function renderPage(pageNum) {
    if (!pdfDoc || !canvasRef) return;
    if (renderTask) {
      renderTask.cancel();
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoomScale });
      const canvas = canvasRef;
      const context = canvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);
      await renderTask.promise;

      // Recompute highlight boxes on current page if a query exists
      if (highlightQuery) {
        await computeHighlightBoxesForPage(page, viewport, highlightQuery);
      }
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF page:', err);
      }
    }
  }

  function extractQueryInfo(input) {
    if (!input) return null;
    if (typeof input === 'string') {
      const cleanStr = input.trim();
      return {
        type: 'text',
        rawText: cleanStr,
        displayLabel: cleanStr.slice(0, 28),
        key: '',
        val: cleanStr,
      };
    }
    // Object input
    const type = input.type || 'text';
    const key = input.key || '';
    const val = input.val !== undefined && input.val !== null ? String(input.val) : '';
    const text = input.text || (val ? `${key} ${val}` : '');
    const label = input.label || key.replace(/_/g, ' ') || text.slice(0, 28) || 'Match';
    return {
      type,
      rawText: text,
      displayLabel: label,
      key,
      val,
      amount: input.amount,
    };
  }

  function parseSearchFeatures(info) {
    if (!info) return null;

    // 1. Text normalization & PII suppression
    let raw = (info.rawText || '').trim();
    // Strip [REDACTED_...] tags
    raw = raw.replace(/\[REDACTED_[A-Z_]+\]/gi, ' ').replace(/\[REDACTED\]/gi, ' ');
    const clean = raw.toLowerCase().replace(/\s+/g, ' ').trim();

    // Comprehensive stopwords
    const genericStopwords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'that',
      'this',
      'have',
      'been',
      'under',
      'their',
      'your',
      'shall',
      'will',
      'page',
      'section',
      'about',
      'also',
      'details',
      'document',
      'policy',
      'invoice',
      'agreement',
      'point',
      'identified',
      'based',
      'file',
      'metadata',
      'information',
      'status',
      'summary',
      'report',
      'company',
      'limited',
      'general',
      'applicable',
      'eligible',
      'received',
      'deduction',
      'which',
      'thereof',
      'herein',
      'whereas',
      'hereby',
      'therein',
      'provided',
      'including',
      'copy',
    ]);

    // 2. Numbers & Amounts extraction (handles Indian 10,00,000, Western 1,000,000, decimals, and plain digits)
    const rawNums = raw.match(/\b\d[\d,.]*\b/g) || [];
    const normalizedNums = new Set();
    for (const n of rawNums) {
      const plain = n.replace(/,/g, '').replace(/\.$/, '');
      if (plain.length >= 2) {
        normalizedNums.add(plain); // unpunctuated: "1000000", "12400"
        normalizedNums.add(n.toLowerCase()); // formatted: "10,00,000"
      }
    }
    if (info.amount) {
      const amtStr = String(info.amount);
      normalizedNums.add(amtStr);
      normalizedNums.add(Math.round(info.amount).toString());
    }

    // 3. Date Aliases generation
    const dateAliases = new Set();
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    const monthsFull = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    // Match ISO dates: YYYY-MM-DD
    const isoDates = raw.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g) || [];
    for (const dStr of isoDates) {
      const parts = dStr.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const dPadded = String(d).padStart(2, '0');
        const mPadded = String(m).padStart(2, '0');
        const mName = months[m - 1];
        dateAliases.add(`${dPadded}-${mPadded}-${y}`);
        dateAliases.add(`${dPadded}/${mPadded}/${y}`);
        dateAliases.add(`${d}-${m}-${y}`);
        dateAliases.add(`${d}/${m}/${y}`);
        dateAliases.add(`${dPadded}-${mName}-${y}`);
        dateAliases.add(`${d}-${mName}-${y}`);
        dateAliases.add(`${dPadded} ${mName} ${y}`);
        dateAliases.add(dStr);
      }
    }

    // Match English dates: Month Day, Year or Day Month Year
    const engDateRegex =
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi;
    let match;
    while ((match = engDateRegex.exec(raw)) !== null) {
      const mStr = match[1].toLowerCase();
      const d = parseInt(match[2], 10);
      const y = match[3];
      let mIdx = monthsFull.indexOf(mStr);
      if (mIdx === -1) mIdx = months.indexOf(mStr.slice(0, 3));
      if (mIdx !== -1) {
        const mNum = mIdx + 1;
        const dPadded = String(d).padStart(2, '0');
        const mPadded = String(mNum).padStart(2, '0');
        const mName = months[mIdx];
        dateAliases.add(`${dPadded}-${mPadded}-${y}`);
        dateAliases.add(`${dPadded}/${mPadded}/${y}`);
        dateAliases.add(`${d}-${mNum}-${y}`);
        dateAliases.add(`${d}/${mNum}/${y}`);
        dateAliases.add(`${dPadded}-${mName}-${y}`);
        dateAliases.add(`${d}-${mName}-${y}`);
        dateAliases.add(`${dPadded} ${mName} ${y}`);
        dateAliases.add(`${y}-${mPadded}-${dPadded}`);
      }
    }

    const revDateRegex =
      /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?,?\s+(\d{4})/gi;
    while ((match = revDateRegex.exec(raw)) !== null) {
      const d = parseInt(match[1], 10);
      const mStr = match[2].toLowerCase();
      const y = match[3];
      let mIdx = monthsFull.indexOf(mStr);
      if (mIdx === -1) mIdx = months.indexOf(mStr.slice(0, 3));
      if (mIdx !== -1) {
        const mNum = mIdx + 1;
        const dPadded = String(d).padStart(2, '0');
        const mPadded = String(mNum).padStart(2, '0');
        const mName = months[mIdx];
        dateAliases.add(`${dPadded}-${mPadded}-${y}`);
        dateAliases.add(`${dPadded}/${mPadded}/${y}`);
        dateAliases.add(`${d}-${mNum}-${y}`);
        dateAliases.add(`${d}/${mNum}/${y}`);
        dateAliases.add(`${dPadded}-${mName}-${y}`);
        dateAliases.add(`${y}-${mPadded}-${dPadded}`);
      }
    }

    // 4. Entity contextual keywords
    const entityKeywords = [];
    if (info.type === 'entity') {
      const key = (info.key || '').toLowerCase();
      if (key.includes('currency')) {
        entityKeywords.push('inr', 'rs', '₹', 'usd', '$', 'total', 'amount', 'premium');
      } else if (key.includes('due') || key.includes('expiry')) {
        entityKeywords.push('due date', 'expiry', 'valid till', 'period to', 'to:');
      } else if (key.includes('effective') || key.includes('start') || key.includes('inception')) {
        entityKeywords.push(
          'effective date',
          'inception date',
          'period from',
          'issuance date',
          'from:',
        );
      } else if (key.includes('total') || key.includes('amount')) {
        entityKeywords.push(
          'total amount',
          'gross premium',
          'total premium',
          'net payable',
          'amount received',
          'total',
        );
      } else if (key.includes('client') || key.includes('recipient') || key.includes('customer')) {
        entityKeywords.push(
          'policyholder',
          'insured',
          'insured person',
          'client',
          'customer',
          'bill to',
        );
      } else if (key.includes('vendor') || key.includes('issuer')) {
        entityKeywords.push('issuer', 'insurance company', 'registered office', 'cin:', 'reg no');
      } else if (key.includes('invoice') || key.includes('number')) {
        entityKeywords.push('invoice no', 'policy no', 'reference no', 'certificate no');
      }
    }

    // 5. Distinctive substantive tokens (>= 3 chars, not stopwords)
    const tokens = clean
      .split(/[\s,.:;'"\(\)\/\\-]+/)
      .filter((t) => t.length >= 3 && !genericStopwords.has(t));

    // 6. Substantive 2-word bigrams
    const words = clean
      .split(/[\s,.:;'"\(\)\/\\-]+/)
      .filter((w) => w.length >= 3 && !genericStopwords.has(w));
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }

    return {
      raw,
      clean,
      cleanWithoutCurrency: clean
        .replace(/[₹$€£,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      normalizedNums: Array.from(normalizedNums),
      dateAliases: Array.from(dateAliases),
      entityKeywords,
      tokens,
      bigrams,
      info,
    };
  }

  async function handleQueryHighlight(queryInput) {
    const info = extractQueryInfo(queryInput);
    if (!info || !info.rawText || info.rawText.trim().length < 2) {
      highlightBoxes = [];
      locateStatus = '';
      currentQueryLabel = '';
      return;
    }

    currentQueryLabel = info.displayLabel;

    if (fileCategory === 'spreadsheet') {
      const feat = parseSearchFeatures(info);
      if (feat && parsedSheets.length > 0) {
        let firstMatchSheet = -1;
        for (let s = 0; s < parsedSheets.length; s++) {
          const sheet = parsedSheets[s];
          const hasMatch = (sheet.rows || []).some((r) =>
            r.some((cell) => isCellMatched(cell, info))
          );
          if (hasMatch) {
            firstMatchSheet = s;
            break;
          }
        }
        if (firstMatchSheet !== -1) {
          activeSheetIndex = firstMatchSheet;
          locateStatus = `Found in ${parsedSheets[firstMatchSheet].name}`;
          await tick();
          scrollToFirstMatchedCell();
        } else {
          locateStatus = 'Not found in grid';
        }
      }
      return;
    }

    if (fileCategory === 'image') {
      locateStatus = 'Available in OCR';
      return;
    }

    if (fileCategory === 'docx' || fileCategory === 'text') {
      const feat = parseSearchFeatures(info);
      if (feat && rawText) {
        const lineMatch = findBestLineMatch(rawText, feat);
        if (lineMatch) {
          locateStatus = `Section match`;
        }
      }
      await tick();
      scrollToHighlightedText();
      return;
    }

    if (viewMode === 'text') {
      const feat = parseSearchFeatures(info);
      if (feat && rawText) {
        const lineMatch = findBestLineMatch(rawText, feat);
        if (lineMatch && lineMatch.pageNumber) {
          locateStatus = `Page ${lineMatch.pageNumber} of ${totalPages || '?'}`;
        }
      }
      await tick();
      scrollToHighlightedText();
      return;
    }

    // In Canvas Mode for PDF: Score all pages to find which page actually contains the target finding
    if (!pdfDoc) return;
    isLocating = true;
    locateStatus = `Locating "${currentQueryLabel}"...`;

    try {
      const feat = parseSearchFeatures(info);
      let bestPage = null;
      let highestScore = 0;

      // Scan every page in the document to score the best target match
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDoc.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((it) => it.str)
          .join(' ')
          .toLowerCase();
        const pageTextNorm = pageText.replace(/,/g, '');

        let score = 0;

        // 1. Exact phrase match receives huge boost
        if (
          feat.clean.length >= 5 &&
          (pageText.includes(feat.clean) || pageTextNorm.includes(feat.cleanWithoutCurrency))
        ) {
          score += 400;
        }

        // 2. Date Aliases match (Huge boost)
        for (const da of feat.dateAliases) {
          if (pageText.includes(da.toLowerCase()) || pageTextNorm.includes(da.toLowerCase())) {
            score += 260;
          }
        }

        // 3. Exact Numbers & Currency Amounts (200 points per distinctive number)
        for (const num of feat.normalizedNums) {
          if (num.length >= 3) {
            if (pageText.includes(num) || pageTextNorm.includes(num)) {
              score += 200;
            }
          } else if (num.length === 2 && /\d{2}/.test(num)) {
            // 2-digit number (like age 29)
            if (
              pageText.includes(` ${num} `) ||
              pageText.includes(`\n${num}`) ||
              pageText.includes(`${num} `)
            ) {
              score += 80;
            }
          }
        }

        // 4. Substantive 2-word bigrams (60 points each)
        for (const bg of feat.bigrams) {
          if (pageText.includes(bg)) {
            score += 60;
          }
        }

        // 5. Entity contextual keywords (70 points each)
        for (const ek of feat.entityKeywords) {
          if (pageText.includes(ek)) {
            score += 70;
          }
        }

        // 6. Distinctive individual tokens (15 points each)
        let matchedTokensCount = 0;
        for (const tok of feat.tokens) {
          if (pageText.includes(tok) || pageTextNorm.includes(tok)) {
            matchedTokensCount++;
            score += 15;
          }
        }

        // Density bonus if majority of key search tokens appear on this page
        if (feat.tokens.length >= 2 && matchedTokensCount >= Math.ceil(feat.tokens.length * 0.7)) {
          score += 80;
        }

        if (score > highestScore) {
          highestScore = score;
          bestPage = p;
        }
      }

      if (bestPage && highestScore > 0) {
        locateStatus = `Page ${bestPage} of ${totalPages}`;
        if (currentPage !== bestPage) {
          currentPage = bestPage;
          await renderPage(currentPage);
        } else {
          const page = await pdfDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: zoomScale });
          await computeHighlightBoxesForPage(page, viewport, queryInput);
        }
      } else {
        locateStatus = `Not found in visual text`;
        highlightBoxes = [];
      }
    } catch (err) {
      console.error('Search error in PDF:', err);
      locateStatus = '';
    } finally {
      isLocating = false;
    }
  }

  async function computeHighlightBoxesForPage(page, viewport, queryInput) {
    try {
      const info = extractQueryInfo(queryInput);
      if (!info) {
        highlightBoxes = [];
        return;
      }
      const feat = parseSearchFeatures(info);
      const content = await page.getTextContent();

      // Group all non-blank text items into horizontal rows by baseline Y
      const nonBlankItems = content.items.filter((it) => it.str && it.str.trim().length > 0);
      const rows = [];

      for (const item of nonBlankItems) {
        const itemY = item.transform[5];
        let foundRow = rows.find((r) => Math.abs(r.y - itemY) <= 4.0);
        if (foundRow) {
          foundRow.items.push(item);
        } else {
          rows.push({ y: itemY, items: [item] });
        }
      }

      // Sort items within each row from left to right (X coordinate)
      for (const r of rows) {
        r.items.sort((a, b) => a.transform[4] - b.transform[4]);
        r.text = r.items
          .map((it) => it.str)
          .join(' ')
          .toLowerCase();
        r.textNormalized = r.text.replace(/,/g, '');
      }

      // Score each row based on matching features
      let bestRow = null;
      let highestRowScore = 0;

      for (const r of rows) {
        let score = 0;
        const rowText = r.text;
        const rowTextNorm = r.textNormalized;

        // Exact phrase in row
        if (
          feat.clean.length >= 4 &&
          (rowText.includes(feat.clean) || rowTextNorm.includes(feat.cleanWithoutCurrency))
        ) {
          score += 400;
        }

        // Date aliases in row
        for (const da of feat.dateAliases) {
          if (rowText.includes(da.toLowerCase())) {
            score += 300;
          }
        }

        // Distinctive numbers in row
        for (const num of feat.normalizedNums) {
          if (num.length >= 3 && (rowText.includes(num) || rowTextNorm.includes(num))) {
            score += 250;
          } else if (
            num.length === 2 &&
            (rowText.includes(` ${num} `) || rowText.includes(`\t${num}`))
          ) {
            score += 120;
          }
        }

        // Substantive bigrams in row
        for (const bg of feat.bigrams) {
          if (rowText.includes(bg)) {
            score += 100;
          }
        }

        // Entity keywords in row
        for (const ek of feat.entityKeywords) {
          if (rowText.includes(ek)) {
            score += 80;
          }
        }

        // Distinctive tokens in row
        for (const tok of feat.tokens) {
          if (rowText.includes(tok) || rowTextNorm.includes(tok)) {
            score += 25;
          }
        }

        if (score > highestRowScore) {
          highestRowScore = score;
          bestRow = r;
        }
      }

      let matchedItems = [];

      if (bestRow && highestRowScore > 0) {
        // From best row, pick the items that actually contributed to the match
        const matchingRowItems = bestRow.items.filter((item) => {
          const str = item.str.toLowerCase();
          const strNorm = str.replace(/,/g, '');

          // Check date aliases
          if (feat.dateAliases.some((da) => str.includes(da.toLowerCase()))) return true;
          // Check numbers
          if (
            feat.normalizedNums.some(
              (num) => num.length >= 2 && (str.includes(num) || strNorm.includes(num)),
            )
          )
            return true;
          // Check clean match
          if (feat.clean.length >= 4 && (str.includes(feat.clean) || feat.clean.includes(str)))
            return true;
          // Check entity keywords
          if (feat.entityKeywords.some((ek) => str.includes(ek))) return true;
          // Check distinctive tokens
          return feat.tokens.some((t) => str.includes(t) || strNorm.includes(t));
        });

        matchedItems = matchingRowItems.length > 0 ? matchingRowItems : bestRow.items.slice(0, 3);
      } else {
        // Fallback to individual items if row grouping didn't catch it
        matchedItems = nonBlankItems
          .filter((item) => {
            const str = item.str.toLowerCase();
            const strNorm = str.replace(/,/g, '');
            if (feat.dateAliases.some((da) => str.includes(da.toLowerCase()))) return true;
            if (
              feat.normalizedNums.some(
                (num) => num.length >= 3 && (str.includes(num) || strNorm.includes(num)),
              )
            )
              return true;
            return feat.clean.length >= 5 && str.includes(feat.clean);
          })
          .slice(0, 2);
      }

      // Convert matched items to exact canvas bounding boxes
      const boxes = [];
      for (const item of matchedItems.slice(0, 3)) {
        const [scaleX, skewY, skewX, scaleY, tx, ty] = item.transform;
        const itemWidth = item.width || item.str.length * 8;
        const itemHeight = Math.max(12, item.height || Math.abs(scaleY) || 14);

        const p1 = viewport.convertToViewportPoint(tx, ty + itemHeight);
        const p2 = viewport.convertToViewportPoint(tx + itemWidth, ty);

        const left = Math.min(p1[0], p2[0]);
        const top = Math.min(p1[1], p2[1]);
        const width = Math.max(28, Math.abs(p2[0] - p1[0]));
        const height = Math.max(16, Math.abs(p2[1] - p1[1]));

        boxes.push({
          left,
          top,
          width,
          height,
          label: info.displayLabel || item.str.slice(0, 20),
        });
      }

      highlightBoxes = boxes;

      // Auto scroll canvas container smoothly to center the bounding box
      if (boxes.length > 0 && canvasContainerRef) {
        await tick();
        const firstBox = boxes[0];
        canvasContainerRef.scrollTo({
          top: Math.max(0, firstBox.top - 100),
          left: Math.max(0, firstBox.left - 40),
          behavior: 'smooth',
        });
      }
    } catch (err) {
      console.warn('Could not compute highlight boxes:', err);
      highlightBoxes = [];
    }
  }

  function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      renderPage(currentPage);
    }
  }

  function changeZoom(factor) {
    zoomScale = Math.max(0.6, Math.min(2.5, zoomScale + factor));
    renderPage(currentPage);
  }

  function findBestLineMatch(text, feat) {
    if (!text || !feat) return null;
    const lines = text.split('\n');
    let bestIdx = -1;
    let highestScore = 0;
    let pageNum = 1;
    const linePages = [];

    // Track page numbers from --- [Page X] --- markers
    let curPage = 1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const pageMatch = l.match(/---\s*\[(?:Page|page)\s*(\d+)\]\s*---/i);
      if (pageMatch) {
        curPage = parseInt(pageMatch[1], 10);
      }
      linePages[i] = curPage;
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lLower = line.toLowerCase().trim();
      const lNorm = lLower.replace(/,/g, '');
      if (!lLower || lLower.startsWith('---')) continue;

      let score = 0;

      // Exact phrase match
      if (
        feat.clean.length >= 5 &&
        (lLower.includes(feat.clean) || lNorm.includes(feat.cleanWithoutCurrency))
      ) {
        score += 450;
      }

      // Date aliases
      for (const da of feat.dateAliases) {
        if (lLower.includes(da.toLowerCase())) {
          score += 320;
        }
      }

      // Distinctive numbers
      for (const num of feat.normalizedNums) {
        if (num.length >= 3 && (lLower.includes(num) || lNorm.includes(num))) {
          score += 260;
        } else if (
          num.length === 2 &&
          (lLower.includes(` ${num} `) ||
            lLower.includes(`-${num}-`) ||
            lLower.includes(`/${num}/`))
        ) {
          score += 80;
        }
      }

      // Bigrams
      for (const bg of feat.bigrams) {
        if (lLower.includes(bg)) {
          score += 100;
        }
      }

      // Entity keywords
      for (const ek of feat.entityKeywords) {
        if (lLower.includes(ek)) {
          score += 80;
        }
      }

      // Distinctive individual tokens
      for (const tok of feat.tokens) {
        if (lLower.includes(tok) || lNorm.includes(tok)) {
          score += 20;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestIdx = idx;
        pageNum = linePages[idx] || 1;
      }
    }

    if (bestIdx >= 0 && highestScore > 0) {
      return {
        lineIndex: bestIdx,
        pageNumber: pageNum,
        score: highestScore,
        rawLine: lines[bestIdx],
      };
    }
    return null;
  }

  function scrollToHighlightedText() {
    setTimeout(() => {
      const container = readerContainerRef || textContainerRef;
      if (!container) return;
      const target =
        container.querySelector('#focal-target-match') ||
        container.querySelector('.focal-target') ||
        container.querySelector('.focal-line-wrapper') ||
        container.querySelector('.active-highlight');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function formatHighlightedText(text, queryInput) {
    if (!text) {
      return '<span class="empty-text-note">No raw text extracted for this document.</span>';
    }
    const info = extractQueryInfo(queryInput);
    if (!info || !info.rawText || info.rawText.trim().length < 2) {
      return escapeHtml(text);
    }

    const feat = parseSearchFeatures(info);
    if (!feat) return escapeHtml(text);

    const lines = text.split('\n');
    const bestMatch = findBestLineMatch(text, feat);
    const bestIdx = bestMatch ? bestMatch.lineIndex : -1;

    // Helper regex for secondary occurrences
    const secondaryTerms = [
      ...feat.dateAliases,
      ...feat.normalizedNums.filter((n) => n.length >= 3),
    ];
    if (feat.clean.length >= 6) {
      secondaryTerms.unshift(feat.clean);
    }
    const secondaryRegex =
      secondaryTerms.length > 0
        ? new RegExp(
            `(${secondaryTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'gi',
          )
        : null;

    const formattedLines = lines.map((line, idx) => {
      // Check if this is a Page Header line
      if (line.trim().startsWith('--- [Page')) {
        return `<div class="text-page-divider">${escapeHtml(line)}</div>`;
      }

      if (idx === bestIdx) {
        // THIS IS THE WINNING FOCAL TARGET LINE!
        const escapedLine = escapeHtml(line);
        const badgeLabel = escapeHtml(info.displayLabel || 'Match');

        // 1. Try exact clean match in focal line
        if (feat.clean.length >= 5) {
          const escClean = feat.clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const cleanRe = new RegExp(`(${escClean})`, 'i');
          if (cleanRe.test(escapedLine)) {
            return (
              `<div class="focal-line-wrapper">` +
              escapedLine.replace(
                cleanRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }

        // 2. Try date aliases in focal line
        for (const da of feat.dateAliases) {
          const escDa = da.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const daRe = new RegExp(`(${escDa})`, 'i');
          if (daRe.test(escapedLine)) {
            return (
              `<div class="focal-line-wrapper">` +
              escapedLine.replace(
                daRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }

        // 3. Try distinctive numbers (e.g. 10,00,000 or 12,400) in focal line
        for (const num of feat.normalizedNums) {
          if (num.length >= 3) {
            const escNum = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const numRe = new RegExp(`(${escNum})`, 'i');
            if (numRe.test(escapedLine)) {
              return (
                `<div class="focal-line-wrapper">` +
                escapedLine.replace(
                  numRe,
                  `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
                ) +
                `</div>`
              );
            }
          }
        }

        // 4. Try distinctive bigrams in focal line
        for (const bg of feat.bigrams) {
          const escBg = bg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const bgRe = new RegExp(`(${escBg})`, 'i');
          if (bgRe.test(escapedLine)) {
            return (
              `<div class="focal-line-wrapper">` +
              escapedLine.replace(
                bgRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }

        // 5. Try distinctive tokens in focal line
        for (const tok of feat.tokens) {
          const escTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const tokRe = new RegExp(`(${escTok})`, 'i');
          if (tokRe.test(escapedLine)) {
            return (
              `<div class="focal-line-wrapper">` +
              escapedLine.replace(
                tokRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }

        // Fallback: wrap the entire focal line
        return `<div class="focal-line-wrapper"><mark id="focal-target-match" class="active-highlight focal-target">${escapedLine}<span class="focal-target-badge">📍 ${badgeLabel}</span></mark></div>`;
      }

      // Secondary lines: subtle highlight
      const escLine = escapeHtml(line);
      if (secondaryRegex && secondaryRegex.test(escLine)) {
        return escLine.replace(secondaryRegex, '<mark class="secondary-match">$1</mark>');
      }
      return escLine;
    });

    return formattedLines.join('\n');
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseSpreadsheetsFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const sheetMarkerRegex = /---\s*\[Sheet:\s*([^\]]+)\]\s*---/gi;
    const matches = [...text.matchAll(sheetMarkerRegex)];

    if (matches.length === 0) {
      const table = parseMarkdownTable(text);
      return [
        {
          name: 'Sheet 1',
          headers: table.headers,
          rows: table.rows,
        },
      ];
    }

    const sheets = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const name = match[1].trim();
      const startIndex = match.index + match[0].length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const sheetChunk = text.slice(startIndex, endIndex);
      const table = parseMarkdownTable(sheetChunk);
      sheets.push({
        name,
        headers: table.headers,
        rows: table.rows,
      });
    }
    return sheets;
  }

  function parseMarkdownTable(chunk) {
    if (!chunk) return { headers: [], rows: [] };
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));

    if (tableLines.length === 0) {
      const csvLines = lines.filter((l) => !l.startsWith('---'));
      if (csvLines.length > 0) {
        const firstLine = csvLines[0]
          .split(',')
          .map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const rows = csvLines
          .slice(1)
          .map((l) => l.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));
        return { headers: firstLine, rows };
      }
      return { headers: ['Content'], rows: lines.map((l) => [l]) };
    }

    const headers = tableLines[0]
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

    const dataRows = [];
    for (let i = 1; i < tableLines.length; i++) {
      const rowStr = tableLines[i];
      if (/^\|\s*[-:]+[-|\s:]*\|$/.test(rowStr)) {
        continue;
      }
      const cells = rowStr
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      dataRows.push(cells);
    }

    return { headers, rows: dataRows };
  }

  function isCellMatched(cellVal, queryInput) {
    if (!queryInput || cellVal === undefined || cellVal === null) return false;
    const strVal = String(cellVal).trim();
    if (!strVal) return false;

    const info = extractQueryInfo(queryInput);
    if (!info) return false;

    const feat = parseSearchFeatures(info);
    if (!feat) return false;

    const valLower = strVal.toLowerCase();
    const valNorm = valLower.replace(/,/g, '');

    if (
      feat.clean.length >= 2 &&
      (valLower.includes(feat.clean) || valNorm.includes(feat.cleanWithoutCurrency))
    ) {
      return true;
    }

    for (const da of feat.dateAliases) {
      if (valLower.includes(da.toLowerCase())) return true;
    }

    for (const num of feat.normalizedNums) {
      if (num.length >= 2 && (valLower.includes(num) || valNorm.includes(num))) {
        return true;
      }
    }

    for (const tok of feat.tokens) {
      if (tok.length >= 3 && (valLower.includes(tok) || valNorm.includes(tok))) {
        return true;
      }
    }

    return false;
  }

  function scrollToFirstMatchedCell() {
    setTimeout(() => {
      if (!gridContainerRef) return;
      const target = gridContainerRef.querySelector('.cell-matched');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 100);
  }

  function renderFormattedDocument(text, queryInput) {
    if (!text) {
      return '<div class="empty-doc-note">No text extracted for this document.</div>';
    }

    const info = extractQueryInfo(queryInput);
    const feat =
      info && info.rawText && info.rawText.trim().length >= 2 ? parseSearchFeatures(info) : null;
    const bestMatch = feat ? findBestLineMatch(text, feat) : null;
    const bestIdx = bestMatch ? bestMatch.lineIndex : -1;

    const secondaryTerms = feat
      ? [...feat.dateAliases, ...feat.normalizedNums.filter((n) => n.length >= 3)]
      : [];
    if (feat && feat.clean.length >= 6) {
      secondaryTerms.unshift(feat.clean);
    }
    const secondaryRegex =
      secondaryTerms.length > 0
        ? new RegExp(
            `(${secondaryTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'gi',
          )
        : null;

    function applyLineHighlight(line, idx) {
      const escaped = escapeHtml(line);
      if (idx === bestIdx && feat) {
        const badgeLabel = escapeHtml(info.displayLabel || 'Match');
        if (feat.clean.length >= 4) {
          const escClean = feat.clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const cleanRe = new RegExp(`(${escClean})`, 'i');
          if (cleanRe.test(escaped)) {
            return (
              `<div class="focal-line-wrapper">` +
              escaped.replace(
                cleanRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }
        for (const tok of feat.tokens) {
          const escTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const tokRe = new RegExp(`(${escTok})`, 'i');
          if (tokRe.test(escaped)) {
            return (
              `<div class="focal-line-wrapper">` +
              escaped.replace(
                tokRe,
                `<mark id="focal-target-match" class="active-highlight focal-target">$1<span class="focal-target-badge">📍 ${badgeLabel}</span></mark>`,
              ) +
              `</div>`
            );
          }
        }
        return `<div class="focal-line-wrapper"><mark id="focal-target-match" class="active-highlight focal-target">${escaped}<span class="focal-target-badge">📍 ${badgeLabel}</span></mark></div>`;
      }
      if (secondaryRegex && secondaryRegex.test(escaped)) {
        return escaped.replace(secondaryRegex, '<mark class="secondary-match">$1</mark>');
      }
      return escaped;
    }

    const lines = text.split('\n');
    const out = [];
    let inTable = false;
    let tableLines = [];
    let inList = false;
    let listLines = [];

    function flushTable() {
      if (tableLines.length === 0) return;
      const t = parseMarkdownTable(tableLines.join('\n'));
      let html = '<div class="reader-table-wrap"><table class="reader-table"><thead><tr>';
      for (const h of t.headers) {
        html += `<th>${escapeHtml(h)}</th>`;
      }
      html += '</tr></thead><tbody>';
      for (const row of t.rows) {
        html += '<tr>';
        for (const c of row) {
          const isM = isCellMatched(c, queryInput);
          html += `<td class="${isM ? 'cell-matched' : ''}">${isM ? '📍 ' : ''}${escapeHtml(c)}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      out.push(html);
      tableLines = [];
      inTable = false;
    }

    function flushList() {
      if (listLines.length === 0) return;
      out.push('<ul class="reader-ul">' + listLines.join('') + '</ul>');
      listLines = [];
      inList = false;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (inList) flushList();
        inTable = true;
        tableLines.push(trimmed);
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (/^[-*•]\s+/.test(trimmed)) {
        inList = true;
        const itemContent = trimmed.replace(/^[-*•]\s+/, '');
        listLines.push(`<li class="reader-li">${applyLineHighlight(itemContent, i)}</li>`);
        continue;
      } else if (inList) {
        flushList();
      }

      if (trimmed.startsWith('--- [Page')) {
        out.push(`<div class="reader-page-divider"><span>${escapeHtml(trimmed)}</span></div>`);
        continue;
      }

      if (trimmed.startsWith('### ')) {
        out.push(`<h3 class="reader-h3">${applyLineHighlight(trimmed.slice(4), i)}</h3>`);
      } else if (trimmed.startsWith('## ')) {
        out.push(`<h2 class="reader-h2">${applyLineHighlight(trimmed.slice(3), i)}</h2>`);
      } else if (trimmed.startsWith('# ')) {
        out.push(`<h1 class="reader-h1">${applyLineHighlight(trimmed.slice(2), i)}</h1>`);
      } else if (!trimmed) {
        continue;
      } else {
        out.push(`<p class="reader-p">${applyLineHighlight(line, i)}</p>`);
      }
    }

    if (inTable) flushTable();
    if (inList) flushList();

    return out.join('\n');
  }
</script>

<div class="pdf-viewer-container">
  <!-- Top Toolbar -->
  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-btn {viewMode === 'canvas' ? 'active' : ''}"
          on:click={() => {
            viewMode = 'canvas';
            if (fileCategory === 'pdf') {
              setTimeout(() => renderPage(currentPage), 50);
            } else if (fileCategory === 'spreadsheet' && highlightQuery) {
              setTimeout(() => scrollToFirstMatchedCell(), 80);
            } else if ((fileCategory === 'docx' || fileCategory === 'text') && highlightQuery) {
              setTimeout(() => scrollToHighlightedText(), 80);
            }
          }}
          title="Switch to visual representation"
        >
          {#if fileCategory === 'pdf'}
            Visual Canvas
          {:else if fileCategory === 'image'}
            Visual Scan
          {:else if fileCategory === 'spreadsheet'}
            Interactive Grid
          {:else if fileCategory === 'docx'}
            Document Reader
          {:else}
            Formatted View
          {/if}
        </button>
        <button
          type="button"
          class="mode-btn {viewMode === 'text' ? 'active' : ''}"
          on:click={() => {
            viewMode = 'text';
            if (highlightQuery) {
              handleQueryHighlight(highlightQuery);
              setTimeout(() => scrollToHighlightedText(), 80);
            }
          }}
          title="Switch to extracted text and glowing highlight markers"
        >
          {#if fileCategory === 'image'}
            OCR Text & Intel
          {:else if fileCategory === 'spreadsheet'}
            Raw Table Data
          {:else if fileCategory === 'docx'}
            Raw Text
          {:else}
            Text & Highlights
          {/if}
        </button>
      </div>

      {#if highlightQuery}
        <div class="highlight-chip-active">
          <span class="chip-dot"></span>
          <span>Locating: <strong>"{currentQueryLabel}"</strong></span>
          {#if locateStatus}
            <span class="locate-badge-pill">{locateStatus}</span>
          {/if}
          <button
            type="button"
            class="clear-chip-btn flex items-center justify-center"
            on:click={() => {
              highlightQuery = '';
              highlightBoxes = [];
              locateStatus = '';
              currentQueryLabel = '';
            }}
            title="Clear highlight"
          >
            <CIcon name="close" size={11} />
          </button>
        </div>
      {/if}
    </div>

    <!-- Mode-specific Toolbar Controls -->
    {#if viewMode === 'canvas'}
      {#if fileCategory === 'pdf'}
        <div class="toolbar-right">
          <div class="page-controls">
            <button
              type="button"
              class="tool-btn"
              on:click={() => changePage(-1)}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <CIcon name="chevron-left" size={12} />
            </button>
            <span class="page-indicator">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              class="tool-btn"
              on:click={() => changePage(1)}
              disabled={currentPage >= totalPages}
              title="Next page"
            >
              <CIcon name="chevron-right" size={12} />
            </button>
          </div>

          <div class="zoom-controls">
            <button type="button" class="tool-btn" on:click={() => changeZoom(-0.25)} title="Zoom out">
              <CIcon name="minus" size={12} />
            </button>
            <span class="zoom-indicator">{Math.round(zoomScale * 100)}%</span>
            <button type="button" class="tool-btn" on:click={() => changeZoom(0.25)} title="Zoom in">
              <CIcon name="plus" size={12} />
            </button>
          </div>
        </div>
      {:else if fileCategory === 'image'}
        <div class="toolbar-right">
          <div class="zoom-controls">
            <button
              type="button"
              class="tool-btn"
              on:click={() => (imageZoom = Math.max(0.4, Number((imageZoom - 0.25).toFixed(2))))}
              title="Zoom out"
            >
              <CIcon name="minus" size={12} />
            </button>
            <button
              type="button"
              class="tool-btn reset-zoom-btn"
              on:click={() => (imageZoom = 1.0)}
              title="Reset Zoom to 100%"
            >
              {Math.round(imageZoom * 100)}%
            </button>
            <button
              type="button"
              class="tool-btn"
              on:click={() => (imageZoom = Math.min(3.0, Number((imageZoom + 0.25).toFixed(2))))}
              title="Zoom in"
            >
              <CIcon name="plus" size={12} />
            </button>
          </div>
        </div>
      {:else if fileCategory === 'spreadsheet'}
        <div class="toolbar-right">
          <div class="meta-stats-chip">
            <span class="chip-dot-green"></span>
            <span>{activeSheet.rows.length} rows</span>
            <span class="chip-divider">•</span>
            <span>{activeSheet.headers.length} columns</span>
            {#if parsedSheets.length > 1}
              <span class="chip-divider">•</span>
              <span>Sheet {activeSheetIndex + 1} of {parsedSheets.length}</span>
            {/if}
          </div>
        </div>
      {:else if fileCategory === 'docx' || fileCategory === 'text'}
        <div class="toolbar-right">
          <div class="meta-stats-chip">
            <span class="chip-dot-blue"></span>
            <span>Formatted Reader</span>
            <span class="chip-divider">•</span>
            <span>{rawText ? rawText.split('\n').filter(Boolean).length : 0} lines</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Viewer Viewport -->
  <div class="viewer-body">
    {#if isLoading}
      <div class="loading-overlay">
        <span class="spinner-large"></span>
        <p>Rendering High-Resolution Canvas...</p>
      </div>
    {/if}

    <!-- MODE 1: VISUAL CANVAS / SPECIALIZED FORMAT VIEWERS -->
    {#if viewMode === 'canvas'}
      {#if fileCategory === 'pdf'}
        <!-- PDF Visual Canvas with Real-time Bounding Box Highlights -->
        <div class="canvas-scroll-wrapper" bind:this={canvasContainerRef}>
          <div class="canvas-relative-container">
            <canvas bind:this={canvasRef} class="pdf-canvas"></canvas>

            {#each highlightBoxes as box}
              <div
                class="canvas-bounding-box"
                style="left: {box.left}px; top: {box.top}px; width: {box.width}px; height: {box.height}px;"
              >
                <span class="box-locator-badge">📍 {box.label || 'Match'}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else if fileCategory === 'image'}
        <!-- Image Document Viewer with Zoom and Locator Pin -->
        <div class="image-viewer-wrapper" bind:this={imageContainerRef}>
          <div class="image-zoom-box" style="transform: scale({imageZoom}); transform-origin: top center;">
            <img src={fileUrl} alt="Document Scan" class="document-img" />
            {#if highlightQuery}
              <div class="image-locator-overlay">
                <span class="chip-dot"></span>
                <span>Entity Located: <strong>"{currentQueryLabel}"</strong></span>
                <button
                  type="button"
                  class="ocr-jump-pill"
                  on:click={() => {
                    viewMode = 'text';
                    setTimeout(() => scrollToHighlightedText(), 80);
                  }}
                >
                  View OCR Text ↗
                </button>
              </div>
            {/if}
          </div>
        </div>
      {:else if fileCategory === 'spreadsheet'}
        <!-- Spreadsheet Interactive Data Grid -->
        <div class="spreadsheet-container">
          {#if parsedSheets.length > 1}
            <div class="spreadsheet-sheet-tabs">
              {#each parsedSheets as sheet, sIdx}
                <button
                  type="button"
                  class="sheet-tab-btn {activeSheetIndex === sIdx ? 'active' : ''}"
                  on:click={() => (activeSheetIndex = sIdx)}
                >
                  <CIcon name="document" size={12} />
                  <span>{sheet.name}</span>
                  <span class="sheet-count-pill">{sheet.rows.length}</span>
                </button>
              {/each}
            </div>
          {/if}

          <div class="spreadsheet-filter-bar">
            <div class="grid-filter-wrap">
              <CIcon name="search" size={13} color="#666" />
              <input
                type="text"
                placeholder="Filter table rows..."
                bind:value={gridFilterQuery}
                class="grid-filter-input"
              />
              {#if gridFilterQuery}
                <button type="button" class="clear-filter-btn" on:click={() => (gridFilterQuery = '')}>✕</button>
              {/if}
            </div>
            <div class="grid-filter-stats">
              Showing {filteredRows.length} of {activeSheet.rows.length} rows
            </div>
          </div>

          <div class="spreadsheet-grid-scroll" bind:this={gridContainerRef}>
            {#if activeSheet.headers.length === 0 && activeSheet.rows.length === 0}
              <div class="empty-sheet-notice">No structured table data detected in spreadsheet.</div>
            {:else}
              <table class="spreadsheet-table">
                <thead>
                  <tr>
                    <th class="row-num-th">#</th>
                    {#each activeSheet.headers as header}
                      <th>{header}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each filteredRows as row, rIdx}
                    <tr>
                      <td class="row-num-td">{rIdx + 1}</td>
                      {#each row as cell}
                        {@const isMatched = isCellMatched(cell, highlightQuery)}
                        <td class="data-cell {isMatched ? 'cell-matched' : ''}">
                          {#if isMatched}
                            <span class="cell-locator-badge">📍 Match</span>
                          {/if}
                          <span>{cell}</span>
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Word DOCX / Text Formatted Reader -->
        <div class="formatted-reader-wrapper" bind:this={readerContainerRef}>
          <div class="formatted-doc-sheet">
            {@html renderFormattedDocument(rawText, highlightQuery)}
          </div>
        </div>
      {/if}
    {:else}
      <!-- MODE 2: INTERACTIVE RAW TEXT & GLOWING HIGHLIGHTS -->
      <div class="text-viewer-wrapper" bind:this={textContainerRef}>
        <div class="text-content">
          {@html formatHighlightedText(rawText, highlightQuery)}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .pdf-viewer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #e5e5e5;
    overflow: hidden;
  }

  .viewer-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e5e5e5;
    gap: 12px;
    flex-wrap: wrap;
    z-index: 10;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mode-toggle {
    display: flex;
    background: #f6f6f6;
    padding: 2px;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
  }

  .mode-btn {
    background: transparent;
    color: #666666;
    font-size: 0.78rem;
    padding: 5px 14px;
    border-radius: 4px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .mode-btn.active {
    background: #111111;
    color: #ffffff;
    font-weight: 600;
    box-shadow: none;
  }

  .mode-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .highlight-chip-active {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fefce8;
    border: 1px solid #fde047;
    color: #854d0e;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.76rem;
    font-weight: 600;
  }

  .chip-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ca8a04;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.5;
      transform: scale(0.9);
    }
    50% {
      opacity: 1;
      transform: scale(1.15);
    }
  }

  .locate-badge-pill {
    background: #f6f6f6;
    border: 1px solid #111111;
    color: #111111;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .clear-chip-btn {
    background: transparent;
    color: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    margin-left: 2px;
  }

  .page-controls,
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f6f6f6;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
  }

  .tool-btn {
    background: #ffffff;
    color: #111111;
    border: 1px solid #e5e5e5;
    width: 26px;
    height: 26px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .tool-btn:hover:not(:disabled) {
    background: #111111;
    color: #ffffff;
    border-color: #111111;
  }

  .tool-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-indicator,
  .zoom-indicator {
    font-size: 0.76rem;
    color: #333333;
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .viewer-body {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    background: #f6f6f6;
  }

  .canvas-scroll-wrapper {
    flex: 1;
    overflow: auto;
    padding: 24px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .canvas-relative-container {
    position: relative;
    display: inline-block;
  }

  .pdf-canvas {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    border: 1px solid #e5e5e5;
    background: #fff;
    display: block;
  }

  /* Real-time Bounding Box over Canvas Text */
  .canvas-bounding-box {
    position: absolute;
    border: 2px solid #b45309;
    background: rgba(245, 158, 11, 0.22);
    box-shadow: 0 0 14px rgba(245, 158, 11, 0.5);
    border-radius: 4px;
    pointer-events: none;
    z-index: 5;
    animation: boxGlow 1.6s infinite alternate ease-in-out;
  }

  @keyframes boxGlow {
    0% {
      border-color: #b45309;
      background: rgba(245, 158, 11, 0.18);
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }
    100% {
      border-color: #d97706;
      background: rgba(245, 158, 11, 0.35);
      box-shadow: 0 0 18px rgba(245, 158, 11, 0.75);
    }
  }

  .box-locator-badge {
    position: absolute;
    top: -24px;
    left: -2px;
    background: #111111;
    color: #ffffff;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 3px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .reset-zoom-btn {
    width: auto !important;
    padding: 0 8px !important;
    font-size: 0.72rem !important;
    font-family: var(--font-mono);
  }

  .meta-stats-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #f6f6f6;
    border: 1px solid #e5e5e5;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.74rem;
    font-weight: 600;
    color: #444444;
  }

  .chip-dot-green {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }

  .chip-dot-blue {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6366f1;
  }

  .chip-divider {
    color: #cccccc;
    font-size: 0.7rem;
  }

  /* IMAGE DOCUMENT VIEWER */
  .image-viewer-wrapper {
    flex: 1;
    overflow: auto;
    padding: 32px 20px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #f0f0f0;
  }

  .image-zoom-box {
    position: relative;
    display: inline-block;
    transition: transform 0.15s ease-out;
  }

  .document-img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    border: 1px solid #dcdcdc;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    display: block;
  }

  .image-locator-overlay {
    position: sticky;
    bottom: 20px;
    left: 50%;
    margin: 16px auto 0 auto;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #111111;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.78rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 10;
    white-space: nowrap;
  }

  .ocr-jump-pill {
    background: #ca8a04;
    color: #111111;
    border: none;
    font-weight: 700;
    font-size: 0.72rem;
    padding: 3px 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .ocr-jump-pill:hover {
    background: #fde047;
  }

  /* SPREADSHEET INTERACTIVE DATA GRID */
  .spreadsheet-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    overflow: hidden;
  }

  .spreadsheet-sheet-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    background: #f8f8f8;
    border-bottom: 1px solid #e5e5e5;
    overflow-x: auto;
  }

  .sheet-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 4px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    font-size: 0.78rem;
    font-weight: 600;
    color: #444444;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .sheet-tab-btn.active {
    background: #111111;
    color: #ffffff;
    border-color: #111111;
  }

  .sheet-count-pill {
    font-size: 0.68rem;
    padding: 1px 6px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.08);
  }

  .sheet-tab-btn.active .sheet-count-pill {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .spreadsheet-filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #ffffff;
    border-bottom: 1px solid #f0f0f0;
    gap: 12px;
  }

  .grid-filter-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #f6f6f6;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 4px 10px;
    width: 240px;
  }

  .grid-filter-input {
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.78rem;
    color: #111111;
    width: 100%;
  }

  .clear-filter-btn {
    background: transparent;
    border: none;
    color: #888888;
    cursor: pointer;
    font-size: 0.72rem;
    padding: 0 2px;
  }

  .grid-filter-stats {
    font-size: 0.75rem;
    color: #666666;
    font-family: var(--font-mono);
  }

  .spreadsheet-grid-scroll {
    flex: 1;
    overflow: auto;
    padding: 0;
  }

  .empty-sheet-notice {
    padding: 40px;
    text-align: center;
    color: #888888;
    font-style: italic;
  }

  .spreadsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }

  .spreadsheet-table th {
    position: sticky;
    top: 0;
    background: #1a1a1a;
    color: #f0f0f0;
    padding: 9px 14px;
    text-align: left;
    font-weight: 600;
    border-right: 1px solid #333333;
    border-bottom: 2px solid #000000;
    white-space: nowrap;
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    z-index: 2;
  }

  .row-num-th {
    width: 44px;
    text-align: center !important;
    background: #111111 !important;
    color: #888888 !important;
  }

  .row-num-td {
    width: 44px;
    text-align: center;
    background: #fafafa;
    color: #888888;
    border-right: 1px solid #e5e5e5;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.72rem;
    user-select: none;
  }

  .spreadsheet-table td {
    padding: 8px 14px;
    border-right: 1px solid #f0f0f0;
    border-bottom: 1px solid #f0f0f0;
    white-space: nowrap;
    color: #222222;
    position: relative;
  }

  .spreadsheet-table tr:hover td:not(.cell-matched) {
    background: #fbfbfb;
  }

  .data-cell.cell-matched {
    background: #fef08a !important;
    color: #111111 !important;
    border: 1.5px solid #ca8a04 !important;
    font-weight: 700 !important;
    box-shadow: 0 0 10px rgba(202, 138, 4, 0.35);
  }

  .cell-locator-badge {
    display: inline-block;
    margin-right: 4px;
    font-size: 0.75rem;
  }

  /* FORMATTED DOCUMENT READER */
  .formatted-reader-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 32px 20px;
    display: flex;
    justify-content: center;
    background: #f6f6f6;
  }

  .formatted-doc-sheet {
    width: 100%;
    max-width: 820px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 48px 56px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    color: #1a1a1a;
    font-family: var(--font-sans, "Inter", sans-serif);
    line-height: 1.7;
  }

  :global(.empty-doc-note) {
    color: #888888;
    font-style: italic;
    text-align: center;
    padding: 40px;
  }

  :global(.reader-h1) {
    font-family: var(--font-heading, "Playfair Display", Georgia, serif);
    font-size: 1.85rem;
    font-weight: 700;
    color: #111111;
    margin: 0 0 18px 0;
    letter-spacing: -0.02em;
    line-height: 1.25;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 12px;
  }

  :global(.reader-h2) {
    font-family: var(--font-heading, "Playfair Display", Georgia, serif);
    font-size: 1.35rem;
    font-weight: 700;
    color: #222222;
    margin: 28px 0 12px 0;
    letter-spacing: -0.01em;
  }

  :global(.reader-h3) {
    font-size: 1.05rem;
    font-weight: 700;
    color: #333333;
    margin: 20px 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  :global(.reader-p) {
    margin: 0 0 14px 0;
    font-size: 0.92rem;
    color: #333333;
  }

  :global(.reader-ul) {
    margin: 0 0 16px 20px;
    padding: 0;
    list-style-type: disc;
  }

  :global(.reader-li) {
    margin-bottom: 6px;
    font-size: 0.9rem;
    color: #333333;
  }

  :global(.reader-page-divider) {
    text-align: center;
    margin: 32px 0 24px 0;
    border-top: 1px dashed #d0d0d0;
    position: relative;
  }

  :global(.reader-page-divider span) {
    position: relative;
    top: -10px;
    background: #ffffff;
    padding: 0 12px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888888;
    font-weight: 600;
  }

  :global(.reader-table-wrap) {
    overflow-x: auto;
    margin: 20px 0;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
  }

  :global(.reader-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  :global(.reader-table th) {
    background: #f8f8f8;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    color: #111111;
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #f0f0f0;
  }

  :global(.reader-table td) {
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
    border-right: 1px solid #f0f0f0;
    color: #333333;
  }

  :global(.reader-table tr:nth-child(even) td) {
    background: #fafafa;
  }

  :global(.reader-table td.cell-matched) {
    background: #fef08a !important;
    color: #111111 !important;
    font-weight: 700;
    border: 1px solid #ca8a04;
  }

  .text-viewer-wrapper {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    margin: 16px;
    border-radius: 4px;
    padding: 24px;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    line-height: 1.7;
    color: #111111;
  }

  .text-content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  :global(.empty-text-note) {
    color: #888888;
    font-style: italic;
  }

  /* Global mark styling for highlighted text */
  :global(.text-content mark.active-highlight) {
    background: #fef08a !important;
    color: #111111 !important;
    border: 1px solid #ca8a04 !important;
    border-radius: 3px !important;
    padding: 2px 6px !important;
    font-weight: 700 !important;
  }

  :global(.text-content .focal-line-wrapper) {
    background: #fefce8 !important;
    border-left: 3px solid #111111 !important;
    padding-left: 10px !important;
    border-radius: 3px !important;
    margin: 6px 0 !important;
    display: block !important;
  }

  :global(.text-content mark.focal-target) {
    background: #fde047 !important;
    color: #111111 !important;
    border: 1.5px solid #111111 !important;
    border-radius: 3px !important;
    padding: 3px 8px !important;
    font-weight: 800 !important;
    position: relative !important;
    display: inline-block !important;
  }

  :global(.text-content .focal-target-badge) {
    position: absolute;
    top: -22px;
    left: 0;
    background: #111111;
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 3px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    pointer-events: none;
    z-index: 5;
  }

  :global(.text-content mark.secondary-match) {
    background: #fef9c3 !important;
    color: #111111 !important;
    border-bottom: 1px dashed #ca8a04 !important;
    padding: 1px 4px !important;
    font-weight: 600 !important;
    border-radius: 2px !important;
  }

  :global(.text-content .text-page-divider) {
    color: #111111;
    font-weight: 700;
    border-top: 1px solid #111111;
    border-bottom: 1px solid #111111;
    background: #f6f6f6;
    padding: 6px 12px;
    margin: 20px 0 12px 0;
    border-radius: 2px;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(246, 246, 246, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 10;
    color: #111111;
  }

  .spinner-large {
    width: 32px;
    height: 32px;
    border: 3px solid #111111;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
