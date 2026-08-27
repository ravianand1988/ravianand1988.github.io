import { Component, input } from '@angular/core';

export interface Metric {
  label: string;
  value: string;
}

/**
 * The figures a case study earned, in tabular mono so the digits line up.
 *
 * Every value comes from the case study's own frontmatter, and every one of
 * those is stated in that case study's prose. Nothing is computed or rounded
 * here, because a metric a reader cannot find in the text below it is a claim
 * with no source.
 *
 * Renders nothing at all when a piece has no figures, rather than an empty
 * strip: two of the five content entries have none.
 */
@Component({
  selector: 'app-metric-list',
  template: `
    @if (metrics().length) {
      <dl class="metrics">
        @for (metric of metrics(); track metric.label) {
          <div class="metric">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metric.value }}</dd>
          </div>
        }
      </dl>
    }
  `,
  styleUrl: './metric-list.component.scss',
})
export class MetricListComponent {
  readonly metrics = input<Metric[]>([]);
}
