import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MythologyComponent } from './mythology.component';

describe('EtimologyComponent', () => {
  let component: MythologyComponent;
  let fixture: ComponentFixture<MythologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MythologyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MythologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
