import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderLibModule } from '../skeleton-loader-lib/skeleton-loader-lib.module';
import { TopLearnersComponent } from './top-learners.component';

@NgModule({
  declarations: [TopLearnersComponent],
  imports: [
    CommonModule,
    SkeletonLoaderLibModule
  ],
  exports: [TopLearnersComponent],
})
export class TopLearnersModule { }
