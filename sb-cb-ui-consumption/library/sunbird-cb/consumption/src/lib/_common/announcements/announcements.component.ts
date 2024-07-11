import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { InsiteDataService } from '../../_services/insite-data.service';

@Component({
  selector: 'sb-uic-announcements',
  templateUrl: './announcements.component.html',
  styleUrls: ['./announcements.component.scss']
})
export class AnnouncementsComponent implements OnInit {

  @Input() objectData: any
  @Input() layoutType:  any
  @Input() mobileHeight: boolean = false
  @Input() fetchDataFromApi: boolean = false
  @Input() channelId: any
  @Output() openDialog = new EventEmitter<any>()
  isLoading: boolean = false
  announcements: any = []
  expand = false
  expanded: boolean = false

  constructor(public insightSvc: InsiteDataService) {
  }

  ngOnInit() {
    if (this.fetchDataFromApi) {
      this.isLoading = true
      this.fetchData()
    }
  }

  fetchData() {
    let request = {
      filterCriteriaMap: {
        channel: [this.channelId],
        //channel: ["01381906916850892825"],
      },
      requestedFields: [
        "name",
        "description",
        "createdOn",
        "updatedOn",
        "category"
      ],
      orderBy: "createdOn",
      orderDirection: "ASC",
      facets: [
        "channel"
      ],
      pageSize: this.objectData.pageSize
    }
    this.insightSvc.fetchAnnouncementsData(request).subscribe((res: any)=> {
      if(res && res.result && res.result.data) {
        res.result.data.forEach((resp: any) => {
          this.announcements.push({
            value: resp.description,
            expanded: false
          })
        })
      }
      if (this.announcements.length > 3) {
        this.expand = true
      }
      
      this.objectData.list = this.announcements
      this.isLoading = false
    }, error => {
      console.log(error)
      this.objectData.list = []
      this.isLoading = false
    })
  }

  viewMoreOrLess(item: any) {
    if (item.value.length > 152) {
      item.expanded = !item.expanded
    }
  }

  openAnnouncements() {
    this.openDialog.emit(true)
  }

  showMoreOrLess() {
    this.expanded = !this.expanded
  }
  

}
