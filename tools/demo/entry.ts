// The demo page's entry (CC-20261116-01, #172): the review picker, then the in-page stand-ins for the
// screen's server, then the screen itself, unchanged. Modules run in this order, so the screen's first
// request already meets the stand-ins.

import "./picker.ts";
import "./transport.ts";
import "../../web/src/main.tsx";
