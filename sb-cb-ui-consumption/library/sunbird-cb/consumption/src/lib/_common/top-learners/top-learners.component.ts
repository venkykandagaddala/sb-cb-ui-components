import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'sb-uic-top-learners',
  templateUrl: './top-learners.component.html',
  styleUrls: ['./top-learners.component.scss']
})
export class TopLearnersComponent implements OnInit {
  @Input() objectData: any
  @Input() channelId: any
  @Input() channnelName: any
  loading: boolean = false

  colors: any = [
    '#EB7181', // red
    '#306933', // green
    '#000000', // black
    '#3670B2', // blue
    '#4E9E87',
    '#7E4C8D',
    '#EB7181', // red
    '#306933', // green
    '#000000', // black
    '#3670B2', // blue
  ]

  constructor() { }

  ngOnInit() {
    this.loading = true
    setTimeout(() => {
      this.loading = false
    }, 5000);
    
  }

  getRank(rank: number) {
    if (rank === 1) {
      return "1st"
    } 
    if (rank === 2) {
      return "2nd"
    } 
    if (rank === 3) {
      return "3rd"
    } else {
      return `${rank}th`
    }    
  }

  getColor() {
    let circleColor = ''
    const randomIndex = Math.floor(Math.random() * Math.floor(this.colors.length))
    circleColor = this.colors[randomIndex]
    return circleColor
  }

  createInititals(name: string) {
    let initials = ''
    const array = name.toString().split(' ')
    if (array[0] !== 'undefined' && typeof array[1] !== 'undefined') {
      initials += array[0].charAt(0)
      initials += array[1].charAt(0)
    } else {
      for (let i = 0; i < name.length; i += 1) {
        if (name.charAt(i) === ' ') {
          continue
        }
        if (name.charAt(i) === name.charAt(i)) {
          initials += name.charAt(i)

          if (initials.length === 2) {
            break
          }
        }
      }
    }
    return initials.toUpperCase()
  }

}
